import { Injectable, forwardRef, Inject } from "@nestjs/common";
import { InjectRepository, InjectConnection } from "@nestjs/typeorm";
import { Repository, Connection, Like } from "typeorm";

import { UserEntity } from "./user.entity";
import { AuthService } from "@/auth/auth.service";
import { UpdateUserProfileResponseError, UserMetaDto } from "./dto";
import { escapeLike } from "@/database/database.utils";
import { SubmissionEntity } from "@/submission/submission.entity";
import { SubmissionStatus } from "@/submission/submission-status.enum";

@Injectable()
export class UserService {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService
  ) {}

  async findUserById(id: number): Promise<UserEntity> {
    return await this.userRepository.findOne(id);
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

  async getUserMeta(user: UserEntity): Promise<UserMetaDto> {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      bio: user.bio,
      isAdmin: user.isAdmin,
      acceptedProblemCount: user.acceptedProblemCount,
      submissionCount: user.submissionCount,
      rating: user.rating
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

  async updateUserProfile(
    user: UserEntity,
    username?: string,
    email?: string,
    bio?: string,
    password?: string
  ): Promise<UpdateUserProfileResponseError> {
    const changingUsername = username != null;
    const changingEmail = email != null;

    try {
      if (changingUsername) user.username = username;
      if (changingEmail) user.email = email;
      if (bio != null) user.bio = bio;

      if (password == null) await this.userRepository.save(user);
      else
        await this.connection.transaction("READ COMMITTED", async transactionalEntityManager => {
          await this.authService.changePassword(await this.authService.findUserAuthByUserId(user.id), password);
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
}
