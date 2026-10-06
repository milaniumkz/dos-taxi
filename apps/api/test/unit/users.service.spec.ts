import { Repository } from "typeorm";

import { ExecutorEntity } from "../../src/modules/executors/entities/executor.entity";
import { UserEntity } from "../../src/modules/users/entities/user.entity";
import { UsersService } from "../../src/modules/users/users.service";

describe("UsersService", () => {
  let usersService: UsersService;
  let usersRepository: jest.Mocked<Repository<UserEntity>>;
  let executorsRepository: jest.Mocked<Repository<ExecutorEntity>>;

  beforeEach(() => {
    usersRepository = {
      findOne: jest.fn(),
      merge: jest.fn((entity, dto) => ({ ...entity, ...dto })),
      save: jest.fn(async (entity) => entity),
    } as unknown as jest.Mocked<Repository<UserEntity>>;
    executorsRepository = {
      update: jest.fn(),
    } as unknown as jest.Mocked<Repository<ExecutorEntity>>;

    usersService = new UsersService(usersRepository, executorsRepository);
  });

  it("returns profile when user exists", async () => {
    usersRepository.findOne.mockResolvedValue({
      id: "user-1",
      phone: "+77010000000",
    } as UserEntity);

    const result = await usersService.getProfile("user-1");

    expect(result.id).toBe("user-1");
  });

  it("updates profile fields", async () => {
    usersRepository.findOne.mockResolvedValue({
      id: "user-1",
      phone: "+77010000000",
      name: "Old name",
    } as UserEntity);

    const result = await usersService.updateProfile("user-1", {
      name: "New name",
      preferredLanguage: "kk",
    });

    expect(usersRepository.merge).toHaveBeenCalledWith(
      expect.objectContaining({ id: "user-1" }),
      expect.objectContaining({
        name: "New name",
        preferredLanguage: "kk",
      }),
    );
    expect(result.name).toBe("New name");
  });
});
