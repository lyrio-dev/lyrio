import { Injectable, forwardRef, Inject } from "@nestjs/common";
import { InjectRepository, InjectConnection } from "@nestjs/typeorm";
import { Repository, Connection, Like, MoreThan } from "typeorm";
import crypto = require("crypto");

import { UserEntity } from "./user.entity";
import { AuthService } from "@/auth/auth.service";
import { UpdateUserProfileResponseError, UserMetaDto } from "./dto";
import { escapeLike } from "@/database/database.utils";
import { SubmissionEntity } from "@/submission/submission.entity";
import { SubmissionStatus } from "@/submission/submission-status.enum";
import { UserPrivilegeService, UserPrivilegeType } from "./user-privilege.service";
import { UserInformationDto } from "./dto/user-information.dto";
import { UserInformationEntity } from "./user-information.entity";
import { UserPreference } from "./user-preference.interface";
import { UserPreferenceEntity } from "./user-preference.entity";

@Injectable()
export class UserService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(UserInformationEntity)
    private readonly userInformationRepository: Repository<UserInformationEntity>,
    @InjectRepository(UserPreferenceEntity)
    private readonly userPreferenceRepository: Repository<UserPreferenceEntity>,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
    @Inject(forwardRef(() => UserPrivilegeService))
    private readonly userPrivilegeService: UserPrivilegeService
  ) {}

  async findUserById(id: number): Promise<UserEntity> {
    return await this.userRepository.findOne({
      id: id
    });
  }

  async findUserInformationByUserId(id: number): Promise<UserInformationDto> {
    return await this.userInformationRepository.findOne({
      userId: id
    });
  }

  public async findUsersByExistingIds(userIds: number[]): Promise<UserEntity[]> {
    if (userIds.length === 0) return [];
    const uniqueIds = Array.from(new Set(userIds));
    const records = await this.userRepository.findByIds(uniqueIds);
    const map = Object.fromEntries(records.map(record => [record.id, record]));
    return userIds.map(userId => map[userId]);
  }

  async findUserByUsername(username: string): Promise<UserEntity> {
    return await this.userRepository.findOne({
      username: username
    });
  }

  /**
   * If the current user is admin or have manage user pervilege, the email will be returned
   * even if the user set public email to false.
   */
  async getUserMeta(user: UserEntity, currentUser: UserEntity): Promise<UserMetaDto> {
    const hash = crypto.createHash("md5");
    hash.update(user.email.trim().toLowerCase());
    return {
      id: user.id,
      username: user.username,
      email:
        user.publicEmail ||
        (currentUser &&
          (currentUser.id === user.id ||
            (await this.userPrivilegeService.userHasPrivilege(currentUser, UserPrivilegeType.MANAGE_USER))))
          ? user.email
          : null,
      gravatarEmailHash: hash.digest("hex"),
      bio: user.bio,
      isAdmin: user.isAdmin,
      acceptedProblemCount: user.acceptedProblemCount,
      submissionCount: user.submissionCount,
      rating: user.rating,
      registrationTime: user.registrationTime
    };
  }

  async userExists(id: number): Promise<boolean> {
    return (await this.userRepository.count({ id: id })) != 0;
  }

  async checkUsernameAvailability(username: string): Promise<boolean> {
    return (
      (await this.userRepository.count({
        username: username
      })) == 0
    );
  }

  async checkEmailAvailability(email: string): Promise<boolean> {
    return (
      (await this.userRepository.count({
        email: email
      })) == 0
    );
  }

  /**
   * The username, email and password won't be updated if null.
   * The information (bio, sex, org, location) will be always updated.
   */
  async updateUserProfile(
    user: UserEntity,
    username: string,
    email: string,
    publicEmail: boolean,
    bio: string,
    password: string,
    information: UserInformationDto
  ): Promise<UpdateUserProfileResponseError> {
    const changingUsername = username != null;
    const changingEmail = email != null;

    try {
      if (changingUsername) user.username = username;
      if (changingEmail) user.email = email;

      user.publicEmail = publicEmail;
      user.bio = bio;

      const userInformation = await this.findUserInformationByUserId(user.id);
      userInformation.organization = information.organization;
      userInformation.location = information.location;
      userInformation.url = information.url;
      userInformation.telegram = information.telegram;
      userInformation.qq = information.qq;
      userInformation.github = information.github;

      await this.connection.transaction("READ COMMITTED", async transactionalEntityManager => {
        if (password != null) {
          await this.authService.changePassword(
            await this.authService.findUserAuthByUserId(user.id),
            password,
            transactionalEntityManager
          );
        }
        await transactionalEntityManager.save(userInformation);
        await transactionalEntityManager.save(user);
      });
    } catch (e) {
      if (changingUsername && !(await this.checkUsernameAvailability(username)))
        return UpdateUserProfileResponseError.DUPLICATE_USERNAME;

      if (changingEmail && !(await this.checkEmailAvailability(email)))
        return UpdateUserProfileResponseError.DUPLICATE_EMAIL;

      throw e;
    }

    return null;
  }

  async searchUser(query: string, wildcard: "START" | "END" | "BOTH", maxTakeCount: number): Promise<UserEntity[]> {
    query = escapeLike(query);
    if (wildcard === "START" || wildcard === "BOTH") query = "%" + query;
    if (wildcard === "END" || wildcard === "BOTH") query = query + "%";

    return await this.userRepository.find({
      where: {
        username: Like(query)
      },
      order: {
        username: "ASC"
      },
      take: maxTakeCount
    });
  }

  async getUserList(
    sortBy: "acceptedProblemCount" | "rating",
    skipCount: number,
    takeCount: number
  ): Promise<[UserEntity[], number]> {
    return await this.userRepository.findAndCount({
      order: {
        [sortBy]: "DESC"
      },
      skip: skipCount,
      take: takeCount
    });
  }

  async updateUserSubmissionCount(userId: number, incSubmissionCount: number): Promise<void> {
    if (incSubmissionCount !== 0) {
      await this.userRepository.increment({ id: userId }, "submissionCount", incSubmissionCount);
    }
  }

  async updateUserAcceptedCount(userId: number): Promise<void> {
    await this.userRepository
      .createQueryBuilder()
      .update({
        acceptedProblemCount: () =>
          "(" +
          this.connection
            .createQueryBuilder()
            .select("COUNT(DISTINCT submission.problemId)")
            .from(SubmissionEntity, "submission")
            .where("submission.submitterId = :userId")
            .andWhere("submission.status = :status")
            .getQuery() +
          ")"
      })
      .where("id = :userId")
      .setParameters({
        userId: userId,
        status: SubmissionStatus.Accepted
      })
      .execute();
  }

  async getUserRank(user: UserEntity): Promise<number> {
    return (
      1 +
      (await this.userRepository.count({
        rating: MoreThan(user.rating)
      }))
    );
  }

  async getUserPreference(user: UserEntity): Promise<UserPreference> {
    const userPreference = await this.userPreferenceRepository.findOne({ userId: user.id });
    return userPreference.preference;
  }

  async updateUserPreference(user: UserEntity, preference: UserPreference): Promise<void> {
    const userPreference = await this.userPreferenceRepository.findOne({ userId: user.id });
    userPreference.preference = preference;
    await this.userPreferenceRepository.save(userPreference);
  }
}
