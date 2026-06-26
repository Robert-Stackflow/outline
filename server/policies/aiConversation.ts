import { User, AiConversation } from "@server/models";
import { allow } from "./cancan";
import { isOwner } from "./utils";

allow(User, ["read", "update", "delete"], AiConversation, isOwner);
