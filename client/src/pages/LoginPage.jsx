import { useContext, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import axios from "axios";
import { UserContext } from "../components/UserContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [redirect, setRedirect] = useState(false);
  const { setUser } = useContext(UserContext);

  // 过滤特殊字符和HTML编码
  function sanitizeInput(input) {
    const filteredInput = input.replace(/[&<>"'/]/g, function (char) {
      switch (char) {
        case "&":
          return "&amp;";
        case "<":
          return "&lt;";
        case ">":
          return "&gt;";
        case '"':
          return "&quot;";
        case "'":
          return "&#x27;";
        case "/":
          return "&#x2F;";
        default:
          return char;
      }
    });
    return filteredInput;
  }

  async function handleLoginSubmit(ev) {
    ev.preventDefault();

    // 进行输入验证和过滤
    const sanitizedEmail = sanitizeInput(email);
    const sanitizedPassword = sanitizeInput(password);

    try {
      const response = await axios.post("/login", {
        email: sanitizedEmail,
        password: sanitizedPassword,
      });
      if (response.data != "not found" && response.status === 200) {
        setUser(response.data);
        alert("Login successful");
        setRedirect(true);
      } else {
        alert("Login failed. Please try again.");
      }
    } catch (e) {
      alert("Login failed. Please try again.");
    }
  }

  if (redirect) {
    return <Navigate to={"/"} />;
  }

  return (
    <div className="mt-4 grow flex items-center justify-around">
      <div className="mb-64">
        <h1 className="text-4xl text-center mb-4">Login</h1>
        <form className="max-w-md mx-auto" onSubmit={handleLoginSubmit}>
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
          />
          <input
            type="password"
            placeholder="password"
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
          />
          <button className="primary">Login</button>
          <div className="text-center py-2 text-gary-500">
            Don't have an account yet?{" "}
            <Link className="underline text-bn" to={"/register"}>
              Register
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
