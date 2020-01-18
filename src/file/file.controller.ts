import { Controller, Post, Body, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "@/common/user.decorator";
import { UserEntity } from "@/user/user.entity";
import { FileService } from "./file.service";
import { FinishUploadRequestDto, FinishUploadResponseDto, FinishUploadResponseError } from "./dto";

@ApiTags("File")
@Controller("file")
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @ApiOperation({
    summary: "Tell the system the client has uploaded a file via a upload url."
  })
  @ApiBearerAuth()
  @Post("finishUpload")
  async finishUpload(
    @CurrentUser() user: UserEntity,
    @Body() request: FinishUploadRequestDto
  ): Promise<FinishUploadResponseDto> {
    const [error, uuid] = await this.fileService.finishUpload(request.uuid);
    if (error)
      return {
        error: FinishUploadResponseError[error]
      };

    return {
      uuid: uuid
    };
  }
}
