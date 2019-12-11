import { ApiProperty } from "@nestjs/swagger";
import { UserMetaDto } from "@/user/dto";
import { GroupMetaDto } from "@/group/dto";

export enum GetProblemPermissionsResponseError {
  NO_SUCH_PROBLEM = "NO_SUCH_PROBLEM",
  PERMISSION_DENIED = "PERMISSION_DENIED"
}

export class GetProblemPermissionsResponseDto {
  @ApiProperty()
  error?: GetProblemPermissionsResponseError;

  @ApiProperty({ type: UserMetaDto, isArray: true })
  users?: UserMetaDto[];

  @ApiProperty({ type: GroupMetaDto, isArray: true })
  groups?: GroupMetaDto[];
}
