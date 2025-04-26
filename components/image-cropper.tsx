"use client"

import type React from "react"

import { useRef, useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Loader2, ZoomIn, RotateCw, Check, X, Maximize } from "lucide-react"

interface ImageCropperProps {
  imageFile: File | null
  isOpen: boolean
  onClose: () => void
  onCropComplete: (croppedImageBlob: Blob) => void
}

export default function ImageCropper({ imageFile, isOpen, onClose, onCropComplete }: ImageCropperProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Detect mobile devices
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)

    return () => {
      window.removeEventListener("resize", checkMobile)
    }
  }, [])

  // Load the image when the file changes
  useEffect(() => {
    if (!imageFile) return

    const url = URL.createObjectURL(imageFile)
    setImageUrl(url)

    const img = new Image()
    img.crossOrigin = "anonymous"
    img.src = url
    img.onload = () => {
      imageRef.current = img
      setIsLoading(false)

      // Auto-fit the image when it loads
      setTimeout(() => {
        fitImageToCanvas()
      }, 100)
    }

    return () => {
      URL.revokeObjectURL(url)
    }
  }, [imageFile])

  // Redraw the canvas when parameters change
  useEffect(() => {
    if (!isLoading) {
      drawImage()
    }
  }, [scale, rotation, position, isLoading])

  // Auto-fit the image to the canvas
  const fitImageToCanvas = () => {
    const canvas = canvasRef.current
    const img = imageRef.current

    if (!canvas || !img) return

    // Calculate the scale needed to fit the image within the canvas
    const canvasSize = canvas.width
    const imgSize = Math.max(img.width, img.height)

    // Use a smaller scale for mobile to show more of the image
    const targetScale = isMobile ? 0.8 : 0.9

    // Calculate scale to fit the image within the canvas with some padding
    const newScale = (canvasSize / imgSize) * targetScale

    setScale(newScale)
    setPosition({ x: 0, y: 0 })
    setRotation(0)
  }

  const drawImage = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    const img = imageRef.current

    if (!canvas || !ctx || !img) return

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Save the context state
    ctx.save()

    // Move to the center of the canvas
    ctx.translate(canvas.width / 2, canvas.height / 2)

    // Rotate the canvas
    ctx.rotate((rotation * Math.PI) / 180)

    // Scale the image
    ctx.scale(scale, scale)

    // Apply position offset
    ctx.translate(position.x / scale, position.y / scale)

    // Draw the image centered
    ctx.drawImage(img, -img.width / 2, -img.height / 2, img.width, img.height)

    // Restore the context state
    ctx.restore()

    // Draw a circular overlay to show the crop area
    ctx.save()
    ctx.globalCompositeOperation = "destination-in"
    ctx.beginPath()
    ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2, 0, Math.PI * 2)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    })
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (!isDragging) return

    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length !== 1) return

    e.preventDefault()
    setIsDragging(true)
    setDragStart({
      x: e.touches[0].clientX - position.x,
      y: e.touches[0].clientY - position.y,
    })
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDragging || e.touches.length !== 1) return

    e.preventDefault()
    setPosition({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    })
  }

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleCrop = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Create a circular clipping path
    const tempCanvas = document.createElement("canvas")
    const size = Math.min(canvas.width, canvas.height)
    tempCanvas.width = size
    tempCanvas.height = size

    const tempCtx = tempCanvas.getContext("2d")
    if (!tempCtx) return

    // Draw the canvas content directly (it's already circular)
    tempCtx.drawImage(canvas, 0, 0, size, size)

    // Convert to blob and complete
    tempCanvas.toBlob(
      (blob) => {
        if (blob) {
          onCropComplete(blob)
        }
      },
      "image/jpeg",
      0.9,
    )
  }

  const handleReset = () => {
    fitImageToCanvas()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Profile Picture</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-[300px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div
              ref={containerRef}
              className="relative overflow-hidden rounded-full mx-auto bg-muted"
              style={{ width: "250px", height: "250px" }}
            >
              <canvas
                ref={canvasRef}
                width={250}
                height={250}
                className={`cursor-${isDragging ? "grabbing" : "grab"}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center">
                <ZoomIn className="h-4 w-4 mr-2" />
                <span className="text-sm font-medium">Zoom</span>
              </div>
              <Slider value={[scale]} min={0.1} max={3} step={0.01} onValueChange={(value) => setScale(value[0])} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center">
                <RotateCw className="h-4 w-4 mr-2" />
                <span className="text-sm font-medium">Rotate</span>
              </div>
              <Slider value={[rotation]} min={0} max={360} step={1} onValueChange={(value) => setRotation(value[0])} />
            </div>

            <div className="flex justify-center space-x-2">
              <Button variant="outline" size="sm" onClick={handleReset} className="flex items-center">
                <Maximize className="h-4 w-4 mr-2" />
                Fit to Screen
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleCrop} disabled={isLoading} className="university-button">
            <Check className="h-4 w-4 mr-2" />
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
