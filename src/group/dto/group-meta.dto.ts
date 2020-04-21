import { ApiProperty } from "@nestjs/swagger";

export class GroupMetaDto {
  @ApiProperty()
  readonly id: number;

  @ApiProperty()
  readonly name: string;

  @ApiProperty()
  readonly ownerId: number;

  @ApiProperty()
  readonly memberCount: number;
}
