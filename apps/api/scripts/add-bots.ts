import { faker } from "@faker-js/faker";
import { supabase } from "../src/lib/supabase";
import { v4 } from "uuid";

export const avatars = {
  avatar_lion: "",
  avatar_frog: "",
  avatar_snake: "",
  avatar_monkey: "",
  avatar_bee: "",
  avatar_panda: "",
  avatar_pig: "",
  avatar_bird: "",
  avatar_penguin: "",
  avatar_donkey: "",
};

const addBots = async () => {
  for (let i = 0; i < 10; i += 1) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    console.log({ firstName, lastName });
    const response = await supabase.from("profiles").insert({
      avatar: Object.keys(avatars)[i],
      id: v4(),
      userId: v4(),
      name: `${firstName} ${lastName}`,
      username: faker.internet.userName({ firstName, lastName }),
      type: "BOT",
    });
    console.log(response);
  }
};

addBots();
