// Adapted from thunder-authentication's App.example.tsx pattern. The routing
// STRUCTURE below is prescribed (see that file's comment header): NoAccess
// replaces the shell, Forbidden sits inside it, /callback is outside the
// provider, every gated route reads its operation from SCREEN_ROUTES, and a
// public screen (none in this app — every flow in wireframes.dsl names a
// role) would be routed above the sign-in guard.

import { useEffect, type ReactElement } from "react";
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import {
  AuthzProvider,
  Forbidden,
  NoAccess,
  RequireOperation,
  useAuthz,
  useScopes,
} from "./authz/gates";
import { SCREEN_ROUTES, reachableScreens, hasScopedReach } from "./authz/screens";
import { setForbiddenNavigator } from "./authz/client";
import { signIn } from "./authz/session";
import { AppShell } from "./shell/AppShell";
import { APP_NAME } from "./appName";
import { CallbackPage } from "./pages/Callback";
import { MyClaimsPage } from "./pages/MyClaims";
import { NewClaimPage } from "./pages/NewClaim";
import { ClaimDetailPage } from "./pages/ClaimDetail";
import { EditClaimPage } from "./pages/EditClaim";
import { ManagerQueuePage } from "./pages/ManagerQueue";
import { ManagerClaimDetailPage } from "./pages/ManagerClaimDetail";
import { FinanceQueuePage } from "./pages/FinanceQueue";
import { FinanceClaimDetailPage } from "./pages/FinanceClaimDetail";
import { ExportBatchesPage } from "./pages/ExportBatches";
import { EmployeeDirectoryPage } from "./pages/EmployeeDirectory";
import { AssignManagerPage } from "./pages/AssignManager";
import { Box, Stack, Typography } from "@wso2/oxygen-ui";

/** YOUR pages, keyed by the screen keys src/authz/screens.ts declares. */
const PAGE_BY_KEY: Record<string, ReactElement> = {
  myclaims: <MyClaimsPage />,
  newclaim: <NewClaimPage />,
  claimdetail: <ClaimDetailPage />,
  editclaim: <EditClaimPage />,
  managerqueue: <ManagerQueuePage />,
  managerclaimdetail: <ManagerClaimDetailPage />,
  financequeue: <FinanceQueuePage />,
  financeclaimdetail: <FinanceClaimDetailPage />,
  exportbatches: <ExportBatchesPage />,
  employeedirectory: <EmployeeDirectoryPage />,
  assignmanager: <AssignManagerPage />,
};

/** No screen in this app is public — every flow in wireframes.dsl names a role. */
const PUBLIC_SCREENS = SCREEN_ROUTES.filter((screen) => screen.public);

export function App(): ReactElement {
  return (
    <BrowserRouter>
      <ForbiddenWiring />
      <Routes>
        <Route path="/callback" element={<CallbackPage />} />
        {PUBLIC_SCREENS.map((screen) => (
          <Route
            key={screen.key}
            path={screen.path}
            element={<AuthzProvider fallback={<Splash />}>{PAGE_BY_KEY[screen.key]}</AuthzProvider>}
          />
        ))}
        <Route
          path="*"
          element={
            <AuthzProvider fallback={<Splash />}>
              <SignedIn />
            </AuthzProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

function ForbiddenWiring(): null {
  const navigate = useNavigate();
  useEffect(() => {
    setForbiddenNavigator(() => navigate("/forbidden", { replace: true }));
  }, [navigate]);
  return null;
}

function Splash(): ReactElement {
  return (
    <Box sx={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Stack spacing={1} alignItems="center">
        <Typography variant="h6">{APP_NAME}</Typography>
        <Typography color="text.secondary">Checking your session…</Typography>
      </Stack>
    </Box>
  );
}

function SignedIn(): ReactElement {
  const { signedIn } = useAuthz();
  const scopes = useScopes();

  // The load-time guard. Only a MISSING session starts a sign-in.
  useEffect(() => {
    if (!signedIn) void signIn();
  }, [signedIn]);

  if (!signedIn) return <Splash />;

  const reachable = reachableScreens(scopes, signedIn);

  if (!hasScopedReach(scopes, signedIn)) return <NoAccess appName={APP_NAME} />;

  const landing = (reachable.find((s) => !s.public && s.loads !== null) ?? reachable[0]).path;

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to={landing} replace />} />
        {SCREEN_ROUTES.map((screen) => {
          if (screen.public) return null;
          const page = PAGE_BY_KEY[screen.key];
          if (screen.loads === null) {
            return <Route key={screen.key} path={screen.path} element={page} />;
          }
          return (
            <Route key={screen.key} element={<RequireOperation op={screen.loads} screen={screen.label} />}>
              <Route path={screen.path} element={page} />
            </Route>
          );
        })}
        <Route path="/forbidden" element={<Forbidden />} />
        <Route path="*" element={<Navigate to={landing} replace />} />
      </Route>
    </Routes>
  );
}
