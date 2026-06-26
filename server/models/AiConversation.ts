import type { InferAttributes, InferCreationAttributes } from "sequelize";
import {
  Column,
  DataType,
  BelongsTo,
  ForeignKey,
  HasMany,
  Table,
  Length,
} from "sequelize-typescript";
import AiMessage from "./AiMessage";
import Document from "./Document";
import Team from "./Team";
import User from "./User";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";

@Table({ tableName: "ai_conversations", modelName: "aiConversation" })
@Fix
class AiConversation extends IdModel<
  InferAttributes<AiConversation>,
  Partial<InferCreationAttributes<AiConversation>>
> {
  @Length({
    max: 1000,
    msg: `title must be 1000 characters or less`,
  })
  @Column
  title: string | null;

  // associations

  @HasMany(() => AiMessage, "conversationId")
  messages: AiMessage[];

  @BelongsTo(() => User, "userId")
  user: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  userId: string;

  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column(DataType.UUID)
  teamId: string;

  @BelongsTo(() => Document, "documentId")
  document: Document | null;

  @ForeignKey(() => Document)
  @Column(DataType.UUID)
  documentId: string | null;
}

export default AiConversation;
