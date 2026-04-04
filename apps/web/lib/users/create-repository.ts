import { DrizzleUsersRepository } from "./repository";

export function createUsersRepository() {
  return new DrizzleUsersRepository();
}
