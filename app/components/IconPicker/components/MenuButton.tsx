import { hover, s } from "@shared/styles";
import styled from "styled-components";
import NudeButton from "~/components/NudeButton";

export const MenuButton = styled(NudeButton)`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  color: ${s("textSecondary")};
  border: 1px solid ${s("inputBorder")};
  border-radius: 7px;
  padding: 0;

  &: ${hover} {
    border-color: ${s("inputBorderFocused")};
    background: ${s("listItemHoverBackground")};
    color: ${s("text")};
  }
`;
