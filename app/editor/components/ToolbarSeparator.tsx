import styled from "styled-components";
import { s } from "@shared/styles";

const Separator = styled.div`
  align-self: center;
  height: 16px;
  width: 1px;
  background: ${s("divider")};
  display: inline-block;
  margin: 0 2px;
  opacity: 0.7;
`;

export default Separator;
