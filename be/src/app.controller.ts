import { Controller, Get } from "@nestjs/common";
import { AppService } from "./app.service";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";

@ApiTags("app")
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiOperation({ summary: "获取欢迎信息" })
  @ApiResponse({
    status: 200,
    description: "欢迎信息",
    schema: { type: "string" },
  })
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
