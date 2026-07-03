import { observer } from "mobx-react";
import { SettingsIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import Heading from "~/components/Heading";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import { MCPSettings } from "./components/MCPSettings";

function Features() {
  const { t } = useTranslation();

  return (
    <Scene title={t("Features")} icon={<SettingsIcon />}>
      <Heading>{t("Features")}</Heading>
      <Text as="p" type="secondary">
        <Trans>Manage AI and integration features for your workspace.</Trans>
      </Text>

      <MCPSettings />
    </Scene>
  );
}

export default observer(Features);
