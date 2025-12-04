import { Injectable, NestMiddleware, Logger } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";

@Injectable()
export class RouteLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RouteLoggingMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    // 获取路由信息
    const { method, originalUrl, ip, hostname } = req;

    // 记录请求开始
    this.logger.log(
      `[${method}] ${originalUrl} - 请求来自 ${ip} (${hostname})`,
    );

    // 记录请求结束
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      this.logger.log(
        `[${method}] ${originalUrl} - ${res.statusCode} - 耗时 ${duration}ms`,
      );
    });

    next();
  }
}
