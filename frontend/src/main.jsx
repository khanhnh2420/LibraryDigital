import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { Provider, useDispatch } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { ConfigProvider, theme } from "antd";
import App from "./App";
import { store } from "./store";
import "./styles.css";
import { loadFromStorage } from "./store/authSlice";
import { getToken, getUser } from "./utils/token";

function Bootstrap() {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(loadFromStorage({ token: getToken(), user: getUser() }));
  }, [dispatch]);
  return <App />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <ConfigProvider
          theme={{
            algorithm: theme.defaultAlgorithm,
            token: { colorPrimary: "#268DB8", borderRadius: 8 }
          }}
        >
          <Bootstrap />
        </ConfigProvider>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
