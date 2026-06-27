import styled from "styled-components";
import InputSearch from "~/components/InputSearch";
import { HStack } from "~/components/primitives/HStack";

export const UserInputContainer = styled(HStack)`
  height: 54px;
  padding: 10px 14px 8px;
`;

export const StyledInputSearch = styled(InputSearch)`
  flex-grow: 1;
  min-width: 0;

  input {
    height: 34px;
  }
`;
