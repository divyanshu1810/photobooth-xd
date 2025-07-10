"use client";
import {
  AlertTriangle,
  Camera,
  CameraOff,
  Download,
  FileText,
  Image as ImageIcon,
  Play,
  RotateCcw,
  Settings,
  Sparkles,
  Square,
  Zap,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";

interface Photo {
  id: string;
  dataUrl: string;
  timestamp: Date;
}

interface Filter {
  name: string;
  label: string;
  style: string;
  gradient: string;
}

const FILTERS: Filter[] = [
  {
    name: "none",
    label: "Original",
    style: "",
    gradient: "from-gray-400 to-gray-600",
  },
  {
    name: "grayscale",
    label: "B&W",
    style: "grayscale(100%)",
    gradient: "from-gray-800 to-gray-900",
  },
  {
    name: "sepia",
    label: "Vintage",
    style: "sepia(100%)",
    gradient: "from-amber-600 to-orange-700",
  },
  {
    name: "blur",
    label: "Soft",
    style: "blur(1px)",
    gradient: "from-blue-400 to-purple-500",
  },
  {
    name: "contrast",
    label: "Pop",
    style: "contrast(120%) saturate(130%)",
    gradient: "from-pink-500 to-rose-600",
  },
];

export default function PhotoboothApp() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [maxPhotos, setMaxPhotos] = useState(4);
  const [countdown, setCountdown] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentFilter, setCurrentFilter] = useState("none");
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [flashEffect, setFlashEffect] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const flashTimerRef = useRef<NodeJS.Timeout | null>(null);

  const addDebugInfo = useCallback((info: string) => {
    setDebugInfo((prev) => [
      ...prev.slice(-9),
      `${new Date().toLocaleTimeString()}: ${info}`,
    ]);
  }, []);

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setError("");
    addDebugInfo("Starting camera...");

    try {
      // Check if video element exists first
      if (!videoRef.current) {
        addDebugInfo("Video element not found - waiting for mount");
        // Wait a bit for React to mount the video element
        await new Promise((resolve) => setTimeout(resolve, 100));
        if (!videoRef.current) {
          throw new Error("Video element not found after waiting");
        }
      }

      // Capture video element reference early
      const videoElement = videoRef.current;
      addDebugInfo("Video element found and captured");

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("getUserMedia is not supported in this browser");
      }

      addDebugInfo("getUserMedia is supported");

      // Check for available devices
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(
          (device) => device.kind === "videoinput"
        );
        addDebugInfo(`Found ${videoDevices.length} video devices`);

        if (videoDevices.length === 0) {
          throw new Error("No camera devices found");
        }
      } catch (deviceError) {
        addDebugInfo("Could not enumerate devices, proceeding anyway");
      }

      // Request camera access with fallback constraints
      let stream: MediaStream;

      try {
        // Try with ideal constraints first
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640, min: 320 },
            height: { ideal: 480, min: 240 },
            facingMode: "user",
          },
          audio: false,
        });
        addDebugInfo("Camera access granted with ideal constraints");
      } catch (constraintError) {
        addDebugInfo(
          `Ideal constraints failed: ${constraintError}, trying basic constraints`
        );
        try {
          // Fallback to basic constraints
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user" },
            audio: false,
          });
          addDebugInfo("Camera access granted with basic constraints");
        } catch (basicError) {
          addDebugInfo(
            `Basic constraints failed: ${basicError}, trying minimal constraints`
          );
          // Last resort - minimal constraints
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
          addDebugInfo("Camera access granted with minimal constraints");
        }
      }

      // Set up the video stream
      videoElement.srcObject = stream;
      streamRef.current = stream;
      addDebugInfo("Stream assigned to video element");

      // Wait for video to be ready
      await new Promise<void>((resolve, reject) => {
        const onLoadedMetadata = () => {
          addDebugInfo("Video metadata loaded");
          videoElement.removeEventListener("loadedmetadata", onLoadedMetadata);
          videoElement.removeEventListener("error", onError);
          setIsStreaming(true);
          resolve();
        };

        const onError = (e: Event) => {
          addDebugInfo(`Video error: ${e}`);
          videoElement.removeEventListener("loadedmetadata", onLoadedMetadata);
          videoElement.removeEventListener("error", onError);
          reject(new Error("Video failed to load"));
        };

        videoElement.addEventListener("loadedmetadata", onLoadedMetadata);
        videoElement.addEventListener("error", onError);

        // Auto-play the video
        videoElement.play().catch((playError) => {
          addDebugInfo(`Video play error: ${playError}`);
          // Don't reject here as the video might still work
        });

        // Timeout fallback
        setTimeout(() => {
          addDebugInfo("Checking timeout condition");
          if (!isStreaming) {
            addDebugInfo("Video loading timeout, assuming success");
            videoElement.removeEventListener(
              "loadedmetadata",
              onLoadedMetadata
            );
            videoElement.removeEventListener("error", onError);
            setIsStreaming(true);
            resolve();
          }
        }, 3000); // Reduced timeout to 3 seconds
      });

      addDebugInfo("Camera started successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      addDebugInfo(`Camera error: ${errorMessage}`);
      setError(errorMessage);

      // Provide specific error messages
      if (
        errorMessage.includes("Permission denied") ||
        errorMessage.includes("NotAllowedError")
      ) {
        setError(
          "Camera permission denied. Please allow camera access and try again."
        );
      } else if (
        errorMessage.includes("NotFoundError") ||
        errorMessage.includes("No camera devices")
      ) {
        setError("No camera found. Please connect a camera device.");
      } else if (errorMessage.includes("NotSupportedError")) {
        setError(
          "Camera not supported in this browser. Try Chrome, Firefox, or Safari."
        );
      } else if (errorMessage.includes("getUserMedia is not supported")) {
        setError(
          "Camera access not supported. Please use HTTPS or a modern browser."
        );
      } else if (errorMessage.includes("Video element not found")) {
        setError("Camera interface not ready. Please try again in a moment.");
      } else {
        setError(`Camera error: ${errorMessage}`);
      }

      // Clean up on error
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    } finally {
      setIsLoading(false);
    }
  }, [addDebugInfo]);

  const stopCamera = useCallback(() => {
    addDebugInfo("Stopping camera...");
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
        addDebugInfo(`Stopped track: ${track.kind}`);
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setError("");
  }, [addDebugInfo]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || photos.length >= maxPhotos)
      return;

    addDebugInfo("Capturing photo...");

    // Flash effect
    setFlashEffect(true);
    if (flashTimerRef.current) {
      clearTimeout(flashTimerRef.current);
    }
    flashTimerRef.current = setTimeout(() => setFlashEffect(false), 200);

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      addDebugInfo("Canvas context not available");
      return;
    }

    // Ensure video has valid dimensions
    const videoWidth = video.videoWidth || video.clientWidth || 640;
    const videoHeight = video.videoHeight || video.clientHeight || 480;

    canvas.width = videoWidth;
    canvas.height = videoHeight;

    // Apply filter
    const currentFilterObj = FILTERS.find((f) => f.name === currentFilter);
    ctx.filter = currentFilterObj?.style || "none";

    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/png");

      const newPhoto: Photo = {
        id: Date.now().toString(),
        dataUrl,
        timestamp: new Date(),
      };

      setPhotos((prev) => [...prev, newPhoto]);
      addDebugInfo(
        `Photo captured successfully (${photos.length + 1}/${maxPhotos})`
      );
    } catch (captureError) {
      addDebugInfo(`Photo capture failed: ${captureError}`);
      setError("Failed to capture photo. Please try again.");
    }
  }, [maxPhotos, currentFilter, photos.length, addDebugInfo]);

  const startCountdown = useCallback(() => {
    if (photos.length >= maxPhotos) return;

    setIsCapturing(true);
    let count = 3;
    setCountdown(count);

    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }

    countdownTimerRef.current = setInterval(() => {
      count--;
      setCountdown(count);

      if (count === 0) {
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }
        capturePhoto();
        setCountdown(0);
        setIsCapturing(false);
      }
    }, 1000);
  }, [capturePhoto, maxPhotos, photos.length]);

  const resetSession = useCallback(() => {
    addDebugInfo("Resetting session...");
    setPhotos([]);
    setIsSessionActive(false);
    setIsCapturing(false);
    setCountdown(0);
    setShowSettings(false);
    setError("");

    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (flashTimerRef.current) {
      clearTimeout(flashTimerRef.current);
      flashTimerRef.current = null;
    }

    stopCamera();
  }, [addDebugInfo, stopCamera]);

  const exportPhotos = useCallback(
    (format: "png" | "jpeg" | "pdf") => {
      if (photos.length === 0) return;

      addDebugInfo(`Exporting ${photos.length} photos as ${format}`);

      if (format === "pdf") {
        const exportCanvas = document.createElement("canvas");
        const ctx = exportCanvas.getContext("2d");
        if (!ctx) {
          addDebugInfo("Could not get export canvas context");
          return;
        }

        const photosPerRow = 2;
        const photoSize = 300;
        const margin = 20;

        exportCanvas.width =
          photosPerRow * photoSize + (photosPerRow + 1) * margin;
        exportCanvas.height =
          Math.ceil(photos.length / photosPerRow) * (photoSize + margin) +
          margin;

        ctx.fillStyle = "#0f0f23";
        ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

        let loadedCount = 0;
        const totalPhotos = photos.length;

        photos.forEach((photo, index) => {
          const img = new Image();
          img.crossOrigin = "anonymous"; // Add this for data URLs
          img.onload = () => {
            try {
              const row = Math.floor(index / photosPerRow);
              const col = index % photosPerRow;
              const x = margin + col * (photoSize + margin);
              const y = margin + row * (photoSize + margin);

              ctx.drawImage(img, x, y, photoSize, photoSize);
              loadedCount++;

              if (loadedCount === totalPhotos) {
                try {
                  const link = document.createElement("a");
                  link.download = `photobooth-session-${Date.now()}.png`;
                  link.href = exportCanvas.toDataURL("image/png");
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  addDebugInfo("Photo collage exported successfully");
                } catch (exportError) {
                  addDebugInfo(`Export error: ${exportError}`);
                }
              }
            } catch (drawError) {
              addDebugInfo(`Draw error: ${drawError}`);
            }
          };
          img.onerror = () => {
            addDebugInfo(`Image load error for photo ${index}`);
            loadedCount++;
            if (loadedCount === totalPhotos) {
              addDebugInfo("Completed with errors");
            }
          };
          img.src = photo.dataUrl;
        });
      } else {
        photos.forEach((photo, index) => {
          try {
            const link = document.createElement("a");
            link.download = `photo-${index + 1}.${format}`;
            link.href =
              format === "jpeg"
                ? photo.dataUrl.replace("image/png", "image/jpeg")
                : photo.dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          } catch (downloadError) {
            addDebugInfo(`Download error for photo ${index}: ${downloadError}`);
          }
        });
        addDebugInfo(`${photos.length} photos exported as ${format}`);
      }
    },
    [photos, addDebugInfo]
  );

  const startSession = useCallback(async () => {
    setIsSessionActive(true);
    // Small delay to ensure video element is mounted
    await new Promise((resolve) => setTimeout(resolve, 100));
    startCamera();
  }, [startCamera]);

  const handleMaxPhotosChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setMaxPhotos(Number(event.target.value));
    },
    []
  );

  // Check browser compatibility on mount
  useEffect(() => {
    addDebugInfo("PhotoBooth initialized");
    addDebugInfo(`Browser: ${navigator.userAgent}`);
    addDebugInfo(`Protocol: ${window.location.protocol}`);
    addDebugInfo(
      `getUserMedia supported: ${!!(
        navigator.mediaDevices && navigator.mediaDevices.getUserMedia
      )}`
    );

    // Check if running on HTTPS or localhost
    const isSecureContext =
      window.location.protocol === "https:" ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "";
    addDebugInfo(`Secure context: ${isSecureContext}`);

    if (!isSecureContext) {
      setError(
        "Camera requires HTTPS or localhost. Please use a secure connection."
      );
    }

    // Check video element mounting
    const checkVideoElement = () => {
      if (videoRef.current) {
        addDebugInfo("Video element mounted successfully");
      } else {
        addDebugInfo("Video element not yet mounted");
        // Check again after a short delay
        setTimeout(checkVideoElement, 100);
      }
    };
    checkVideoElement();
  }, [addDebugInfo]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Cleanup function
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
      if (flashTimerRef.current) {
        clearTimeout(flashTimerRef.current);
      }
    };
  }, []); // Empty dependency array to run only on unmount

  const progressPercentage = (photos.length / maxPhotos) * 100;
  const currentFilterObj = FILTERS.find((f) => f.name === currentFilter);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white overflow-hidden relative">
      {/* Flash Effect */}
      {flashEffect && (
        <div className="fixed inset-0 bg-white z-50 pointer-events-none opacity-80" />
      )}

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl backdrop-blur-sm border border-purple-500/30 mb-6">
            <Camera className="w-8 h-8 text-purple-400 mr-3" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              PhotoBooth Pro
            </h1>
            <Sparkles className="w-8 h-8 text-pink-400 ml-3" />
          </div>
          <p className="text-gray-300 text-lg">
            Capture perfect moments with style
          </p>
        </header>

        {/* Error Display */}
        {error && (
          <div className="max-w-2xl mx-auto mb-6 p-4 bg-red-900/50 border border-red-500/50 rounded-xl backdrop-blur-sm">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-red-300">Camera Error</h3>
                <p className="text-red-200">{error}</p>
                <div className="mt-2 text-sm text-red-300">
                  <p>Troubleshooting tips:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Make sure you're using HTTPS or localhost</li>
                    <li>Click "Allow" when prompted for camera permission</li>
                    <li>
                      Check that your camera isn't being used by another
                      application
                    </li>
                    <li>
                      Try refreshing the page and allowing camera access again
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Debug Info (only show if there are errors or in development) */}
        {(error || debugInfo.length > 0) && (
          <details className="max-w-2xl mx-auto mb-6">
            <summary className="cursor-pointer text-gray-400 hover:text-white mb-2">
              Debug Information ({debugInfo.length} entries)
            </summary>
            <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-4 max-h-40 overflow-y-auto">
              {debugInfo.map((info, index) => (
                <div
                  key={index}
                  className="text-sm text-gray-300 font-mono mb-1"
                >
                  {info}
                </div>
              ))}
            </div>
          </details>
        )}

        {!isSessionActive ? (
          /* Welcome Screen */
          <main className="max-w-lg mx-auto">
            <div className="bg-gray-900/90 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/50">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mx-auto flex items-center justify-center shadow-2xl mb-6">
                  <Camera className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-3xl font-bold mb-3">Ready to Start?</h2>
                <p className="text-gray-400 text-lg">
                  Configure your photoshoot session
                </p>
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-gray-300">
                    Number of Photos: {maxPhotos}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={maxPhotos}
                    onChange={handleMaxPhotosChange}
                    className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <button
                  onClick={startSession}
                  disabled={isLoading || !!error}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed py-4 px-8 rounded-2xl font-bold text-lg transition-all duration-300 transform hover:scale-105 active:scale-95"
                >
                  <div className="flex items-center justify-center space-x-3">
                    {isLoading ? (
                      <>
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Starting Camera...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-6 h-6" />
                        <span>Start PhotoBooth</span>
                      </>
                    )}
                  </div>
                </button>

                {error && (
                  <button
                    onClick={() => {
                      setError("");
                      setDebugInfo([]);
                      setTimeout(() => startSession(), 100);
                    }}
                    className="w-full mt-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 py-3 px-6 rounded-xl font-semibold transition-all duration-300"
                  >
                    <div className="flex items-center justify-center space-x-3">
                      <RotateCcw className="w-5 h-5" />
                      <span>Retry Camera Access</span>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </main>
        ) : (
          /* Main App */
          <main className="grid lg:grid-cols-3 gap-8">
            {/* Camera Section */}
            <section className="lg:col-span-2">
              <div className="bg-gray-900/95 backdrop-blur-xl rounded-3xl p-6 border border-gray-700/50">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">Camera Studio</h2>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowSettings(!showSettings)}
                      className={`p-3 rounded-xl transition-all duration-300 ${
                        showSettings
                          ? "bg-purple-500 text-white"
                          : "bg-gray-700/50 hover:bg-gray-600/50 text-gray-300"
                      }`}
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                    <button
                      onClick={resetSession}
                      className="p-3 bg-gray-700/50 hover:bg-red-500/20 hover:text-red-400 text-gray-300 rounded-xl transition-all duration-300"
                    >
                      <RotateCcw className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Camera Preview */}
                <div className="relative aspect-video bg-black rounded-2xl overflow-hidden mb-6">
                  {/* Always render video element */}
                  <video
                    ref={videoRef}
                    key="camera-video"
                    autoPlay
                    muted
                    playsInline
                    className={`w-full h-full object-cover ${
                      !isStreaming ? "opacity-0" : ""
                    }`}
                    style={{
                      filter: isStreaming
                        ? currentFilterObj?.style || "none"
                        : "none",
                    }}
                  />

                  {!isStreaming && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <CameraOff className="w-20 h-20 mx-auto mb-4 text-gray-500" />
                        <p className="text-gray-400 text-lg">
                          Camera Not Active
                        </p>
                      </div>
                    </div>
                  )}

                  {countdown > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                      <div className="text-9xl font-black text-white animate-bounce">
                        {countdown}
                      </div>
                    </div>
                  )}

                  {isStreaming && (
                    <div className="absolute top-4 left-4 flex items-center space-x-2">
                      <div className="bg-red-500 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center space-x-2">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        <span>LIVE</span>
                      </div>
                      <div className="bg-gray-900/80 text-white px-3 py-2 rounded-full text-sm">
                        {photos.length}/{maxPhotos}
                      </div>
                    </div>
                  )}
                </div>

                {/* Filters */}
                {showSettings && (
                  <div className="mb-6 p-5 bg-gray-800/30 rounded-2xl border border-gray-700/30">
                    <h3 className="text-lg font-semibold mb-4">
                      Creative Filters
                    </h3>
                    <div className="grid grid-cols-5 gap-3">
                      {FILTERS.map((filter) => (
                        <button
                          key={filter.name}
                          onClick={() => setCurrentFilter(filter.name)}
                          className={`p-4 rounded-xl text-sm font-medium transition-all duration-300 ${
                            currentFilter === filter.name
                              ? `bg-gradient-to-r ${filter.gradient} text-white`
                              : "bg-gray-700/30 hover:bg-gray-600/40 text-gray-300"
                          }`}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Controls */}
                <div className="flex justify-center space-x-4">
                  {!isStreaming ? (
                    <button
                      onClick={() => {
                        setError("");
                        setTimeout(() => startCamera(), 100);
                      }}
                      disabled={isLoading || !!error}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed py-4 px-8 rounded-2xl font-bold text-lg transition-all duration-300 flex items-center space-x-3"
                    >
                      {isLoading ? (
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Camera className="w-6 h-6" />
                      )}
                      <span>{isLoading ? "Starting..." : "Start Camera"}</span>
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={startCountdown}
                        disabled={isCapturing || photos.length >= maxPhotos}
                        className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed py-4 px-12 rounded-2xl font-bold text-lg transition-all duration-300 flex items-center space-x-3"
                      >
                        <Zap className="w-6 h-6" />
                        <span>
                          {isCapturing ? "Taking Photo..." : "Take Photo"}
                        </span>
                      </button>
                      <button
                        onClick={stopCamera}
                        className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 py-4 px-8 rounded-2xl font-bold text-lg transition-all duration-300 flex items-center space-x-3"
                      >
                        <Square className="w-5 h-5" />
                        <span>Stop</span>
                      </button>
                    </>
                  )}
                </div>

                {/* Progress */}
                <div className="mt-6">
                  <div className="flex justify-between text-sm mb-3">
                    <span className="text-gray-300 font-medium">
                      Session Progress
                    </span>
                    <span className="text-gray-300 font-bold">
                      {photos.length} / {maxPhotos}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-pink-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                      style={{
                        width: `${progressPercentage}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Photos Gallery & Export */}
            <aside className="space-y-6">
              {/* Photo Gallery */}
              <section className="bg-gray-900/95 backdrop-blur-xl rounded-3xl p-6 border border-gray-700/50">
                <h3 className="text-xl font-bold mb-6 flex items-center space-x-3">
                  <ImageIcon className="w-6 h-6 text-purple-400" />
                  <span>Photo Gallery</span>
                </h3>

                {photos.length === 0 ? (
                  <div className="text-center text-gray-400 py-12">
                    <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg">No photos captured yet</p>
                    <p className="text-sm mt-2 opacity-70">
                      Start taking photos to see them here
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {photos.map((photo, index) => (
                      <div
                        key={photo.id}
                        className="relative group overflow-hidden rounded-xl border-2 border-gray-600/30"
                      >
                        <img
                          src={photo.dataUrl}
                          alt={`Photo ${index + 1}`}
                          className="w-full aspect-square object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                        <div className="absolute bottom-3 left-3 right-3 bg-black/50 rounded p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <p className="text-white text-xs">
                            {photo.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Export Options */}
              {photos.length > 0 && (
                <section className="bg-gray-900/95 backdrop-blur-xl rounded-3xl p-6 border border-gray-700/50">
                  <h3 className="text-xl font-bold mb-6 flex items-center space-x-3">
                    <Download className="w-6 h-6 text-green-400" />
                    <span>Export Options</span>
                  </h3>

                  <div className="space-y-4">
                    <button
                      onClick={() => exportPhotos("png")}
                      className="w-full bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 py-3 px-6 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center space-x-3"
                    >
                      <ImageIcon className="w-5 h-5" />
                      <span>Download as PNG</span>
                    </button>

                    <button
                      onClick={() => exportPhotos("jpeg")}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-700 hover:from-green-600 hover:to-emerald-800 py-3 px-6 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center space-x-3"
                    >
                      <ImageIcon className="w-5 h-5" />
                      <span>Download as JPEG</span>
                    </button>

                    <button
                      onClick={() => exportPhotos("pdf")}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 py-3 px-6 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center space-x-3"
                    >
                      <FileText className="w-5 h-5" />
                      <span>Create Photo Collage</span>
                    </button>
                  </div>
                </section>
              )}
            </aside>
          </main>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
