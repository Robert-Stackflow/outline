import type { InferAttributes, InferCreationAttributes } from "sequelize";
import {
  Column,
  DataType,
  BelongsTo,
  ForeignKey,
  Table,
} from "sequelize-typescript";
import { AiMessageRole } from "@shared/types";
import AiConversation from "./AiConversation";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";

@Table({ tableName: "ai_messages", modelName: "aiMessage" })
@Fix
class AiMessage extends IdModel<
  InferAttributes<AiMessage>,
  Partial<InferCreationAttributes<AiMessage>>
> {
  @Column(DataType.STRING)
  role: AiMessageRole;

  @Column(DataType.TEXT)
  content: string;

  // associations

  @BelongsTo(() => AiConversation, "conversationId")
  conversation: AiConversation;

  @ForeignKey(() => AiConversation)
  @Column(DataType.UUID)
  conversationId: string;
}

export default AiMessage;
