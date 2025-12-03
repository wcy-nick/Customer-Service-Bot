import { Test, TestingModule } from "@nestjs/testing";
import { LocalAuthGuard } from "./local-auth.guard";

describe("LocalAuthGuard", () => {
  let localAuthGuard: LocalAuthGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LocalAuthGuard],
    }).compile();

    localAuthGuard = module.get<LocalAuthGuard>(LocalAuthGuard);
  });

  it("should be defined", () => {
    expect(localAuthGuard).toBeDefined();
  });

  it("should extend AuthGuard('local')", () => {
    expect(localAuthGuard).toBeInstanceOf(Object);
  });
});
