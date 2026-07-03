import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBitbucket,
  faDiscord,
  faGithub,
  faGitlab,
  faGoogle,
  faMicrosoft,
  faSlack,
} from "@fortawesome/free-brands-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import * as React from "react";
import styled from "styled-components";
import PluginIcon from "~/components/PluginIcon";

type Props = {
  /** The authentication provider id, used to fall back to a plugin icon. */
  id: string;
  /** Optional brand icon key (e.g. "github", "gitlab"). */
  brand?: string;
  /** External provider id, used to infer the brand for connected providers. */
  providerId?: string;
  /** The size of the icon. */
  size?: number;
};

const brands: Record<string, IconDefinition> = {
  github: faGithub,
  gitlab: faGitlab,
  google: faGoogle,
  microsoft: faMicrosoft,
  bitbucket: faBitbucket,
  slack: faSlack,
  discord: faDiscord,
};

const brandAliases: Array<[string, keyof typeof brands]> = [
  ["github", "github"],
  ["gitlab", "gitlab"],
  ["google", "google"],
  ["microsoftonline", "microsoft"],
  ["microsoft", "microsoft"],
  ["azure", "microsoft"],
  ["bitbucket", "bitbucket"],
  ["slack", "slack"],
  ["discord", "discord"],
];

function getBrandIcon(
  ...values: Array<string | undefined>
): IconDefinition | undefined {
  for (const value of values) {
    const normalized = value?.toLowerCase();

    if (!normalized) {
      continue;
    }

    if (brands[normalized]) {
      return brands[normalized];
    }

    const brand = brandAliases.find(([needle]) =>
      normalized.includes(needle)
    )?.[1];

    if (brand) {
      return brands[brand];
    }
  }

  return undefined;
}

/**
 * Renders a sign-in provider icon. When a known brand key is supplied a
 * FontAwesome brand glyph is used, otherwise it falls back to the plugin's
 * registered icon.
 */
function AuthProviderIcon({ id, brand, providerId, size = 24 }: Props) {
  const icon = getBrandIcon(brand, id, providerId);

  if (icon) {
    return (
      <Wrapper $size={size}>
        <FontAwesomeIcon
          icon={icon}
          style={{ width: size * 0.8, height: size * 0.8 }}
        />
      </Wrapper>
    );
  }

  return <PluginIcon id={id} size={size} />;
}

const Wrapper = styled.span<{ $size: number }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: ${(props) => props.$size}px;
  height: ${(props) => props.$size}px;
`;

export default AuthProviderIcon;
