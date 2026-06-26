import { NotFoundError } from "@server/errors";
import type { User } from "@server/models";
import { Document } from "@server/models";
import { authorize } from "@server/policies";

type Props = {
  id: string;
  user: User;
  includeState?: boolean;
};

export default async function loadDocument({
  id,
  user,
  includeState,
}: Props): Promise<Document> {
  const document = await Document.findByPk(id, {
    userId: user ? user.id : undefined,
    paranoid: false,
    includeState,
  });

  if (!document) {
    throw NotFoundError();
  }

  if (document.deletedAt) {
    // don't send data if user cannot restore deleted doc
    if (user) {
      authorize(user, "restore", document);
    }
  } else {
    if (user) {
      authorize(user, "read", document);
    }
  }

  // Self-hosted override: remove the paid-license gate on documents imported
  // during a trial. The upstream check previously threw a PaymentRequiredError
  // here, blocking self-hosters from viewing perfectly valid content.

  return document;
}
