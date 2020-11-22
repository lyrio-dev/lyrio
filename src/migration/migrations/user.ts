/* eslint-disable */
import { isEmail } from "class-validator";
import randomstring from "randomstring";
import * as bcrypt from "bcrypt";

import { isUsername } from "@/common/validators";
import { UserEntity } from "@/user/user.entity";
import { UserAuthEntity } from "@/auth/user-auth.entity";
import { UserInformationEntity } from "@/user/user-information.entity";
import { UserPreferenceEntity } from "@/user/user-preference.entity";
import { UserPrivilegeEntity, UserPrivilegeType } from "@/user/user-privilege.entity";

import { MigrationInterface } from "./migration.interface";
import { OldDatabaseUserEntity, OldDatabaseUserPrivilegeEntity } from "./old-database.interface";

import { UserMigrationInfoEntity } from "../user-migration-info.entity";

export const migrationUser: MigrationInterface = {
  async migrate(entityManager, config, oldDatabase, queryTablePaged) {
    const randomUsername = (id: number) =>
      `user_${id}_${randomstring.generate({ length: 8, charset: "alphanumeric" })}`;
    const getAvatarInfo = (email: string) => {
      const i = email.toLowerCase().indexOf("@qq.com");
      if (i !== -1) {
        const qq = email.substr(0, i);
        if (Number.isSafeInteger(Number(qq))) return `qq:${qq}`;
      }
      return "gravatar:";
    };

    await queryTablePaged<OldDatabaseUserEntity>(
      "user",
      "id",
      async oldUser => {
        const userMigrationInfo = new UserMigrationInfoEntity();

        const user = new UserEntity();
        user.id = oldUser.id;

        if (isUsername(oldUser.username)) {
          user.username = oldUser.username;
          userMigrationInfo.usernameMustChange = false;
        } else {
          user.username = randomUsername(oldUser.id);
          userMigrationInfo.usernameMustChange = true;
        }

        if (isEmail(oldUser.email) && (await entityManager.count(UserEntity, { email: oldUser.email })) === 0)
          user.email = oldUser.email;
        else user.email = `${randomUsername(oldUser.id)}@syzoj2-users.test`;

        user.publicEmail = !!oldUser.public_email;
        user.nickname = "";
        user.bio = (oldUser.information || "").substr(0, 160);
        user.avatarInfo = getAvatarInfo(oldUser.email);
        user.isAdmin = !!oldUser.is_admin;
        user.submissionCount = 0;
        user.acceptedProblemCount = 0;
        user.rating = oldUser.rating || 0;
        user.registrationTime =
          typeof oldUser.register_time === "number" && oldUser.register_time
            ? new Date(oldUser.register_time * 1000)
            : null;
        await entityManager.save(user);

        const userAuth = new UserAuthEntity();
        userAuth.userId = user.id;
        userAuth.password = null; // null for unmigrated users
        await entityManager.save(userAuth);

        const userInformation = new UserInformationEntity();
        userInformation.userId = user.id;
        userInformation.organization = "";
        userInformation.location = "";
        userInformation.url = "";
        userInformation.telegram = "";
        userInformation.qq = "";
        userInformation.github = "";
        await entityManager.save(userInformation);

        const userPreference = new UserPreferenceEntity();
        userPreference.userId = user.id;
        userPreference.preference = !oldUser.prefer_formatted_code ? { codeFormatter: { disableByDefault: true } } : {};
        await entityManager.save(userPreference);

        userMigrationInfo.migrated = false;
        userMigrationInfo.oldEmail = oldUser.email;
        // A too-large cost of bcrypt will significantly reduce the speed of migration
        userMigrationInfo.oldPasswordHashBcrypt = await bcrypt.hash(oldUser.password.toLowerCase(), 8);
        userMigrationInfo.oldUsername = oldUser.username;
        userMigrationInfo.userId = user.id;
        await entityManager.save(userMigrationInfo);
      },
      1
    );

    await queryTablePaged<OldDatabaseUserPrivilegeEntity>("user_privilege", "user_id", async oldUserPrivilege => {
      const userPrivilegeEntity = new UserPrivilegeEntity();
      userPrivilegeEntity.userId = oldUserPrivilege.user_id;

      switch (oldUserPrivilege.privilege) {
        case "manage_problem":
          userPrivilegeEntity.privilegeType = UserPrivilegeType.ManageProblem;
          break;
        case "manage_user":
          userPrivilegeEntity.privilegeType = UserPrivilegeType.ManageUser;
          break;
        default:
      }

      if (!userPrivilegeEntity.privilegeType) return;

      await entityManager.save(userPrivilegeEntity);
    });
  }
};
