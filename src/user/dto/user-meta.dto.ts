import { ApiProperty } from "@nestjs/swagger";

export class UserMetaDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  username: string;

  @ApiProperty()
  email: string;

  /**
   * The email may not be visible to everyone, so encode its hash (for gravatar url) separately.
   */
  @ApiProperty()
  gravatarEmailHash: string;

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

  @ApiProperty()
  registrationTime: Date;
}
