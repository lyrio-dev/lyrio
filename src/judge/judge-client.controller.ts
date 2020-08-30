import { Controller, Post, Body, Get } from "@nestjs/common";
import { ApiOperation, ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "@/common/user.decorator";
import { UserEntity } from "@/user/user.entity";

import { JudgeClientService } from "./judge-client.service";

import {
  AddJudgeClientRequestDto,
  AddJudgeClientResponseDto,
  AddJudgeClientResponseError,
  DeleteJudgeClientRequestDto,
  DeleteJudgeClientResponseDto,
  DeleteJudgeClientResponseError,
  ListJudgeClientsResponseDto,
  ResetJudgeClientKeyRequestDto,
  ResetJudgeClientKeyResponseDto,
  ResetJudgeClientKeyResponseError
} from "./dto";

@ApiTags("Judge Client")
@Controller("judgeClient")
export class JudgeClientController {
  constructor(private readonly judgeClientService: JudgeClientService) {}

  @ApiOperation({
    summary: "Add a new judge client."
  })
  @ApiBearerAuth()
  @Post("addJudgeClient")
  async addJudgeClient(
    @CurrentUser() user: UserEntity,
    @Body() request: AddJudgeClientRequestDto
  ): Promise<AddJudgeClientResponseDto> {
    if (!user || !user.isAdmin)
      return {
        error: AddJudgeClientResponseError.PERMISSION_DENIED
      };

    const judgeClient = await this.judgeClientService.addJudgeClient(request.name, request.allowedHosts);

    return {
      judgeClient: await this.judgeClientService.getJudgeClientInfo(judgeClient, true)
    };
  }

  @ApiOperation({
    summary: "Delete a judge client."
  })
  @ApiBearerAuth()
  @Post("deleteJudgeClient")
  async deleteJudgeClient(
    @CurrentUser() user: UserEntity,
    @Body() request: DeleteJudgeClientRequestDto
  ): Promise<DeleteJudgeClientResponseDto> {
    if (!user || !user.isAdmin)
      return {
        error: DeleteJudgeClientResponseError.PERMISSION_DENIED
      };

    const judgeClient = await this.judgeClientService.findJudgeClientById(request.id);
    if (!judgeClient)
      return {
        error: DeleteJudgeClientResponseError.NO_SUCH_JUDGE_CLIENT
      };

    await this.judgeClientService.deleteJudgeClient(judgeClient);

    return {};
  }

  @ApiOperation({
    summary: "Reset the key of a judge client."
  })
  @ApiBearerAuth()
  @Post("resetJudgeClientKey")
  async resetJudgeClientKey(
    @CurrentUser() user: UserEntity,
    @Body() request: ResetJudgeClientKeyRequestDto
  ): Promise<ResetJudgeClientKeyResponseDto> {
    if (!user || !user.isAdmin)
      return {
        error: ResetJudgeClientKeyResponseError.PERMISSION_DENIED
      };

    const judgeClient = await this.judgeClientService.findJudgeClientById(request.id);
    if (!judgeClient)
      return {
        error: ResetJudgeClientKeyResponseError.NO_SUCH_JUDGE_CLIENT
      };

    await this.judgeClientService.resetJudgeClientKey(judgeClient);

    return {
      key: judgeClient.key
    };
  }

  @ApiOperation({
    summary: "List all judge clients."
  })
  @ApiBearerAuth()
  @Get("listJudgeClients")
  async listJudgeClients(@CurrentUser() currentUser: UserEntity): Promise<ListJudgeClientsResponseDto> {
    const judgeClients = await this.judgeClientService.listJudgeClients();
    return {
      judgeClients: await Promise.all(
        judgeClients.map(
          async judgeClient =>
            await this.judgeClientService.getJudgeClientInfo(judgeClient, currentUser && currentUser.isAdmin)
        )
      ),
      hasManagePermission: currentUser && currentUser.isAdmin
    };
  }
}
