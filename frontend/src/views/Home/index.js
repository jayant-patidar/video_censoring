import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Button,
  Container,
  Grid,
  Typography,
  AppBar,
  Toolbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  createTheme,
  ThemeProvider,
  LinearProgress,
  Input,
  Box,
  Snackbar,
  Card,
  CardMedia,
  CardContent,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import Layout from "../Layout/layout";

const HomePage = () => {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [openUploadModal, setOpenUploadModal] = useState(false);
  const [openMessageModal, setOpenMessageModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImageName, setSelectedImageName] = useState(null);
  const [videoLink, setVideoLink] = useState("");
  const [videoDuration, setVideoDuration] = useState();
  const [fixVideoDuration, setFixVideoDuration] = useState();
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [cssClass, setCssClass] = useState("decolor-error");
  const [showProgressBar, setShowProgressBar] = useState(false);
  const hostLocal = "http://localhost:5000";
  const hostRemote = "http://35.193.133.90:5000";
  let local = false;
  let host = "";
  if (local) {
    host = hostLocal;
  } else {
    host = hostRemote;
  }

  const theme = createTheme({
    palette: {
      primary: {
        main: "#0216b0",
      },
      success: {
        main: "#4caf50",
      },
      error: {
        main: "#f44336",
      },
    },
  });

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const response = await axios.get(host + "/getVideos");
      setVideos(response.data);
    } catch (error) {
      console.error("Error fetching videos:", error);
    }
  };

  const handleOpenUploadModal = () => {
    setOpenUploadModal(true);
  };

  const handleOpenMessageModal = () => {
    setOpenMessageModal(true);
  };

  const handleCloseUploadModal = () => {
    setOpenUploadModal(false);
    fetchVideos();
  };

  const handleCloseMessageModal = () => {
    setOpenMessageModal(false);
    fetchVideos();
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    const allowedTypes = [
      "video/mp4",
      "video/mpeg",
      "video/quicktime",
      "video/webm",
      "video/x-msvideo",
    ];

    if (file && allowedTypes.includes(file.type)) {
      setSelectedFile(file);
      setSelectedImageName(file.name);
      console.log(file.name);
    } else {
      // Reset selected file and show error message
      setSelectedFile(null);
      setSnackbarMessage("Please select a valid video file.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  };

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    const allowedTypes = ["image/jpeg", "image/png", "image/x-png"];

    if (file && allowedTypes.includes(file.type)) {
      console.log(file);
      setSelectedImage(file);
    } else {
      // Reset selected file and show error message
      setSelectedImage(null);
      setSnackbarMessage("Please select a valid Image file.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  };
  const handleUploadVideo = async () => {
    if (!selectedFile) {
      setSnackbarMessage("Please select a video file.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      console.log("No file Selected");
      return;
    }
    handleUploadImage();
    setShowProgressBar(true);

    const formData = new FormData();
    formData.append("file", selectedFile);
    try {
      const response = await axios.post(host + "/uploadVideo", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded / progressEvent.total) * 100
          );
          setUploadProgress(progress);
        },
      });
      console.log("Upload success:", response.data);

      setShowProgressBar(false);

      setSnackbarMessage("File uploaded successfully!");
      setSnackbarSeverity("success");
      setCssClass("decolor-success");
      setSnackbarOpen(true);
      handleOpenMessageModal();
    } catch (error) {
      console.error("Error uploading file:", error);

      setShowProgressBar(false);

      setSnackbarMessage("Error uploading file. Please try again later.");
      setSnackbarSeverity("error");
      setCssClass("decolor-error");
      setSnackbarOpen(true);
    }

    handleCloseUploadModal();
  };

  const handleUploadImage = async () => {
    if (!selectedFile) {
      setSnackbarMessage("Please select a thumbnail image file.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      console.log("No thumbnail image selected");
      return;
    }

    setShowProgressBar(true);
    const formData = new FormData();
    formData.append("image", selectedImage);
    formData.append("imageName", selectedImageName);

    try {
      const response = await axios.post(host + "/uploadImage", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded / progressEvent.total) * 100
          );
          setUploadProgress(progress);
        },
      });
      console.log("Upload success:", response.data);

      setShowProgressBar(false);

      setSnackbarMessage("File uploaded successfully!");
      setSnackbarSeverity("success");
      setCssClass("decolor-success");
      setSnackbarOpen(true);
      handleOpenMessageModal();
    } catch (error) {
      console.error("Error uploading file:", error);

      setShowProgressBar(false);

      setSnackbarMessage("Error uploading file. Please try again later.");
      setSnackbarSeverity("error");
      setCssClass("decolor-error");
      setSnackbarOpen(true);
    }

    handleCloseUploadModal();
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const handleVideoLinkChange = (event) => {
    setVideoLink(event.target.value);
  };

  const handleVideoLinkSubmit = async () => {
    try {
      if (!videoLink || !isValidLink(videoLink)) {
        // Display error message if video link is empty
        setSnackbarMessage("Please enter a valid video link.");
        setSnackbarSeverity("error");
        setCssClass("decolor-error");
        setSnackbarOpen(true);
        return;
      }
      console.log(videoLink);
      // Make a POST request to the backend API with the video link
      const response = await axios.post(`${host}/downloadAndUploadVideo`, {
        videoLink: videoLink,
      });

      // Log the response from the backend
      setVideoDuration(response.data.videoDuration + 2);
      setFixVideoDuration(response.data.videoDuration + 2);
      console.log(response.data);
      setSnackbarMessage("File uploaded successfully!");
      setSnackbarSeverity("success");
      setCssClass("decolor-success");
      setSnackbarOpen(true);
      handleOpenMessageModal();
      setVideoLink("");

      // Add any additional logic here
    } catch (error) {
      // Handle errors if any
      console.error("Error processing video of given link:", error);
      setSnackbarMessage(
        "Error processing video of given link. Please try again later."
      );
      setSnackbarSeverity("error");
      setCssClass("decolor-error");
    }
  };

  const isValidLink = (link) => {
    // Regular expression to match YouTube video URLs
    const youtubeRegex = /^(https?\:\/\/)?(www\.youtube\.com|youtu\.?be)\/.+$/;

    // Test the provided link against the regex
    return youtubeRegex.test(link);
  };

  useEffect(() => {
    let timer;
    if (openMessageModal) {
      // Decrement the progress value every second
      timer = setInterval(() => {
        setVideoDuration((prevDuration) => {
          if (prevDuration > 1) {
            return prevDuration - 1;
          } else {
            // Close the modal and reload the page when the wait time reaches zero
            setOpenMessageModal(false);
            fetchVideos(); // Reload the page
            return prevDuration;
          }
        });
      }, 60000); // Update every second (1000 milliseconds)
    } else {
      // Clear the interval when the modal is closed
      clearInterval(timer);
    }
    return () => clearInterval(timer);
  }, [openMessageModal]);

  return (
    <Layout>
      <Container maxWidth="lg" style={{ paddingTop: "20px" }}>
        <Grid
          container
          justifyContent="space-between"
          alignItems="center"
          marginBottom="20px"
        >
          <Grid item xs={8}>
            <Input
              type="text"
              placeholder="Paste video link here"
              value={videoLink}
              onChange={handleVideoLinkChange}
              style={{ width: "100%", marginLeft: "20px" }}
            />
          </Grid>
          <Grid item xs={2}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleVideoLinkSubmit}
              style={{ marginRight: "10px", marginLeft: "40px" }}
            >
              Submit
            </Button>
            OR
          </Grid>

          <Grid
            item
            xs={2}
            style={{
              display: "flex",
              justifyContent: "end",
              alignItems: "center",
            }}
          >
            <Button
              variant="contained"
              color="primary"
              onClick={handleOpenUploadModal}
              startIcon={<CloudUploadIcon />}
            >
              Upload Video
            </Button>
            <Dialog open={openUploadModal} onClose={handleCloseUploadModal}>
              <DialogTitle
                style={{ backgroundColor: "#1976d2", color: "#fff" }}
              >
                Upload Video
              </DialogTitle>
              <DialogContent>
                <h3>Select Video</h3>
                <Input
                  id="file-upload"
                  type="file"
                  fullWidth
                  onChange={handleFileChange}
                  style={{ marginBottom: "10px", marginTop: "20px" }}
                />
                <h3>Select Thumbnail</h3>
                <Input
                  id="image-upload"
                  type="file"
                  fullWidth
                  onChange={handleImageChange}
                  style={{ marginBottom: "10px", marginTop: "20px" }}
                />
                {showProgressBar && (
                  <Box mt={2}>
                    <LinearProgress
                      variant="determinate"
                      value={uploadProgress}
                    />
                  </Box>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={handleCloseUploadModal}>Cancel</Button>
                <Button color="primary" onClick={handleUploadVideo}>
                  Upload
                </Button>
              </DialogActions>
            </Dialog>

            {/* pop up for General message to wait for the video after upload */}
            <Dialog open={openMessageModal} onClose={handleOpenMessageModal}>
              <DialogTitle
                style={{ backgroundColor: "#1976d2", color: "#fff" }}
              >
                Message
              </DialogTitle>
              <DialogContent>
                <h3>
                  We are assessing your video for sensitive content. Video
                  should be available shortly ! Approximate wait time is :{" "}
                  {videoDuration} minutes.
                </h3>
                <LinearProgress
                  variant="determinate"
                  value={(1 - videoDuration / fixVideoDuration) * 100} // Calculate progress based on minutes
                />
              </DialogContent>

              <DialogActions>
                <Button onClick={handleCloseMessageModal}>
                  Wait in background
                </Button>
              </DialogActions>
            </Dialog>
          </Grid>
        </Grid>
        <Grid container spacing={3}>
          {videos.map((video, index) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
              <Link
                to={`/video/${video.fileName}/${encodeURIComponent(
                  video.fileURL
                )}`}
                style={{ textDecoration: "none" }}
              >
                <Card style={{ height: "100%" }}>
                  <CardMedia
                    component="img"
                    height="140"
                    image={`${video.imageURL}`}
                  />

                  <CardContent>
                    <Typography gutterBottom variant="h5" component="div">
                      {video.fileName}
                    </Typography>
                  </CardContent>
                </Card>
              </Link>
            </Grid>
          ))}
        </Grid>
      </Container>
      <Snackbar
        open={snackbarOpen}
        // open="true"
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        message={snackbarMessage}
        // message="Dummy test"
        // style={{ backgroundColor: snackbarSeverity === 'success' ? theme.palette.success.main : theme.palette.error.main }}
        anchorOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        className={cssClass}
      />
    </Layout>
  );
};

export default HomePage;
