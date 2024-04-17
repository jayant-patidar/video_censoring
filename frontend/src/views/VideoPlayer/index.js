import React, { useState, useEffect } from "react";
import ReactPlayer from "react-player";
import Layout from "../Layout/layout";
import { Container, Grid, Typography, IconButton } from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import { Link } from "react-router-dom";
import { useParams } from "react-router-dom";

const VideoPlayerPage = () => {
  const { fileName, fileURL } = useParams();

  console.log("###" + fileName + "####" + fileURL);

  useEffect(() => {}, []);

  return (
    <Layout>
      <Container maxWidth="lg" style={{ paddingTop: "20px" }}>
        <Grid container alignItems="center">
          <Grid item>
            <Link to="/" style={{ textDecoration: "none" }}>
              <IconButton color="primary">
                <ArrowBack />
              </IconButton>
            </Link>
          </Grid>
          <Grid item>
            <Typography variant="h4" gutterBottom>
              {fileName}
            </Typography>
          </Grid>
        </Grid>
        <Grid item xs={12} md={8}>
          <div
            style={{
              position: "relative",
              paddingTop: "56.25%",
              top: 0,
              left: 0,
            }}
          >
            <ReactPlayer
              url={fileURL}
              controls
              playing={true}
              width="100%"
              height="90%"
              style={{ position: "absolute", top: 0, left: 0 }}
            />
          </div>
        </Grid>
      </Container>
    </Layout>
  );
};

export default VideoPlayerPage;
