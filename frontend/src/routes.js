import React, { lazy, Suspense, useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import HomePage from "./views/Home";
import VideoPlayerPage from "./views/VideoPlayer";

const Router = () => {
  const SuspenseLoading = () => {
    const [show, setShow] = useState(false);
    useEffect(() => {
      let timeout = setTimeout(() => setShow(true), 300);
      return () => {
        clearTimeout(timeout);
      };
    }, []);
    return show ? (
      <div className="AppLoading">
        <div className="AppLoadingContent">
          <img src="/loading.gif" alt="Loading" />
        </div>
      </div>
    ) : null;
  };

  return (
    <Suspense fallback={<SuspenseLoading />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/video/:fileName/:fileURL" element={<VideoPlayerPage />} />
      </Routes>
    </Suspense>
  );
};

export default Router;
