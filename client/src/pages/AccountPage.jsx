import axios from "axios";
import { useContext, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import AccountNav from "../components/AccountNav";
import { UserContext } from "../components/UserContext";
import PlacePage from "./PlacesPage";

export default function AccountPage() {
  const [redirect, setRedirect] = useState(null);
  const { ready, user, setUser } = useContext(UserContext);

  let subpage = useParams().subpage;

  if (subpage === undefined) {
    subpage = "profile";
  }

  async function logout() {
    try {
      await axios.post("/logout");
      setUser(null); // 确保注销后清除用户状态
      setRedirect("/login");
    } catch (error) {
      console.error("Logout failed", error);
      // 处理注销失败的情况，例如显示错误消息
      alert("发生错误，注销失败");
    }
  }

  if (!ready) {
    return "loading...";
  }

  if (ready && !user && !redirect) {
    return <Navigate to={"/login"} />;
  }

  if (redirect) {
    return <Navigate to={redirect} />;
  }

  return (
    <div>
      <AccountNav />
      {subpage === "profile" && (
        <div className="text-center max-w-lg mx-auto">
          Logged in as {user.name} ({user.email})<br />
          <button onClick={logout} className="primary max-w-sm mt-2">
            Logout
          </button>
        </div>
      )}
      {subpage === "places" && <PlacePage />}
    </div>
  );
}
