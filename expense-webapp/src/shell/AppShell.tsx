import type { JSX } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  AppShell as OxygenAppShell,
  ColorSchemeToggle,
  Divider,
  Footer,
  Header,
  Sidebar,
  UserMenu,
} from "@wso2/oxygen-ui";
import { LogOut } from "@wso2/oxygen-ui-icons-react";
import { APP_NAME } from "../appName";
import { Can, useAuthz, useHeldRoles } from "../authz/gates";
import { railScreens } from "../authz/screens";
import { signOut } from "../authz/session";
import type { OperationKey } from "../authz/operations.gen";

/** The one rail, gated item by item — a caller holding two roles sees the union. */
export function AppShell(): JSX.Element {
  const { pathname } = useLocation();
  const { scopes, signedIn, username } = useAuthz();
  const roles = useHeldRoles();
  const rail = railScreens(scopes, signedIn);
  const active = rail.find((screen) => pathname.startsWith(screen.path))?.key ?? rail[0]?.key;

  return (
    <OxygenAppShell>
      <OxygenAppShell.Navbar>
        <Header>
          <Header.Toggle />
          <Header.Brand>
            <Header.BrandTitle>{APP_NAME}</Header.BrandTitle>
          </Header.Brand>
          <Header.Spacer />
          <Header.Actions>
            <ColorSchemeToggle />
            <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
            <UserMenu>
              <UserMenu.Trigger name={username || "Signed in"} showName />
              <UserMenu.Header
                name={username || "Signed in"}
                email={username}
                role={roles.join(", ") || "No role"}
              />
              <UserMenu.Item icon={<LogOut />} label="Sign out" onClick={() => void signOut()} />
            </UserMenu>
          </Header.Actions>
        </Header>
      </OxygenAppShell.Navbar>

      <OxygenAppShell.Sidebar>
        <Sidebar activeItem={active}>
          <Sidebar.Nav>
            <Sidebar.Category>
              {SCREEN_META.map((screen) => (
                <Can key={screen.key} op={screen.op}>
                  <Sidebar.Item id={screen.key} link={<Link to={screen.path} />}>
                    <Sidebar.ItemLabel>{screen.navLabel}</Sidebar.ItemLabel>
                  </Sidebar.Item>
                </Can>
              ))}
            </Sidebar.Category>
          </Sidebar.Nav>
        </Sidebar>
      </OxygenAppShell.Sidebar>

      <OxygenAppShell.Main>
        <Outlet />
      </OxygenAppShell.Main>

      <OxygenAppShell.Footer>
        <Footer>
          <Footer.Copyright>© WSO2 LLC</Footer.Copyright>
        </Footer>
      </OxygenAppShell.Footer>
    </OxygenAppShell>
  );
}

// One row per rail item, in wireframe order. `Can` (not a hand-rolled filter)
// is what actually decides visibility; this table only carries what `Can`
// needs — the operation each item's screen loads — so it can never drift from
// src/authz/screens.ts's SCREEN_ROUTES.
const SCREEN_META: readonly { key: string; navLabel: string; path: string; op: OperationKey }[] = [
  { key: "myclaims", navLabel: "My Claims", path: "/claims", op: "GET /me/claims" },
  { key: "managerqueue", navLabel: "Approval Queue", path: "/approvals", op: "GET /me/team/claims" },
  { key: "financequeue", navLabel: "Finance Review", path: "/finance", op: "GET /claims" },
  { key: "exportbatches", navLabel: "Export", path: "/export", op: "GET /export-batches" },
  { key: "employeedirectory", navLabel: "Employees", path: "/employees", op: "GET /employees" },
];
