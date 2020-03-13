import { ApiProperty } from "@nestjs/swagger";

export class UserMetaDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  username: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  bio: string;

  @ApiProperty()
  isAdmin: boolean;

  @ApiProperty()
  acceptedProblemCount: number;

  @ApiProperty()
  submissionCount: number;

  @ApiProperty()
  rating: number;
}
