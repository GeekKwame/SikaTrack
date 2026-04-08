import { createBrowserRouter } from "react-router";
import { Root } from "./components/Root";
import { Dashboard } from "./screens/Dashboard";
import { AddTransaction } from "./screens/AddTransaction";
import { TransactionHistory } from "./screens/TransactionHistory";
import { Insights } from "./screens/Insights";
import { Login } from "./screens/Login";
import { Signup } from "./screens/Signup";
import { Budget } from "./screens/Budget";
import { Goals } from "./screens/Goals";
import { Profile } from "./screens/Profile";
import { AskSika } from "./screens/AskSika";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/signup",
    Component: Signup,
  },
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Dashboard },
      { path: "add", Component: AddTransaction },
      { path: "history", Component: TransactionHistory },
      { path: "insights", Component: Insights },
      { path: "budget", Component: Budget },
      { path: "goals", Component: Goals },
      { path: "profile", Component: Profile },
      { path: "ask", Component: AskSika },
    ],
  },
]);
