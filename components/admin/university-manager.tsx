"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"
import { getUniversities, type University } from "@/lib/universities"
import { Loader2, Plus, Trash2 } from "lucide-react"

export function UniversityManager() {
  const [universities, setUniversities] = useState<University[]>([])
  const [loading, setLoading] = useState(true)
  const [newUniversity, setNewUniversity] = useState({
    name: "",
    location: "",
    abbreviation: "",
  })
  const [isAdding, setIsAdding] = useState(false)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchUniversities()
  }, [])

  async function fetchUniversities() {
    setLoading(true)
    try {
      const data = await getUniversities()
      setUniversities(data)
    } catch (error) {
      console.error("Error loading universities:", error)
      toast({
        title: "Error",
        description: "Failed to load universities",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleAddUniversity(e: React.FormEvent) {
    e.preventDefault()
    setIsAdding(true)

    try {
      // Validate inputs
      if (!newUniversity.name || !newUniversity.location) {
        toast({
          title: "Missing information",
          description: "University name and location are required",
          variant: "destructive",
        })
        return
      }

      // Add university to database
      const { data, error } = await supabase
        .from("universities")
        .insert([
          {
            name: newUniversity.name,
            location: newUniversity.location,
            abbreviation: newUniversity.abbreviation || null,
          },
        ])
        .select()

      if (error) {
        throw error
      }

      toast({
        title: "University added",
        description: `${newUniversity.name} has been added successfully`,
      })

      // Reset form and refresh list
      setNewUniversity({
        name: "",
        location: "",
        abbreviation: "",
      })
      fetchUniversities()
    } catch (error: any) {
      console.error("Error adding university:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to add university",
        variant: "destructive",
      })
    } finally {
      setIsAdding(false)
    }
  }

  async function handleDeleteUniversity(id: number) {
    setIsDeleting(id)

    try {
      const { error } = await supabase.from("universities").delete().eq("id", id)

      if (error) {
        throw error
      }

      toast({
        title: "University deleted",
        description: "The university has been removed",
      })

      // Refresh list
      fetchUniversities()
    } catch (error: any) {
      console.error("Error deleting university:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete university",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(null)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add New University</CardTitle>
          <CardDescription>Add a new university to the system</CardDescription>
        </CardHeader>
        <form onSubmit={handleAddUniversity}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="university-name">University Name</Label>
                <Input
                  id="university-name"
                  placeholder="Harvard University"
                  value={newUniversity.name}
                  onChange={(e) => setNewUniversity({ ...newUniversity, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="university-location">Location</Label>
                <Input
                  id="university-location"
                  placeholder="Cambridge, MA"
                  value={newUniversity.location}
                  onChange={(e) => setNewUniversity({ ...newUniversity, location: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="university-abbreviation">Abbreviation (Optional)</Label>
              <Input
                id="university-abbreviation"
                placeholder="Harvard"
                value={newUniversity.abbreviation}
                onChange={(e) => setNewUniversity({ ...newUniversity, abbreviation: e.target.value })}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="bg-[#8a70d6] hover:bg-[#7a60c6]" disabled={isAdding}>
              {isAdding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add University
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manage Universities</CardTitle>
          <CardDescription>View and manage all universities in the system</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-[#8a70d6]" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Abbreviation</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {universities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No universities found. Add one above.
                    </TableCell>
                  </TableRow>
                ) : (
                  universities.map((university) => (
                    <TableRow key={university.id}>
                      <TableCell className="font-medium">{university.name}</TableCell>
                      <TableCell>{university.location}</TableCell>
                      <TableCell>{university.abbreviation || "-"}</TableCell>
                      <TableCell>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteUniversity(university.id)}
                          disabled={isDeleting === university.id}
                        >
                          {isDeleting === university.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
