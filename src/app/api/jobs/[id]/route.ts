import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const job = await prisma.job.findUnique({ where: { id } });
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    return NextResponse.json(job);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch job" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user as any)?.role !== "recruiter") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const data = await req.json();

    // Get the recruiter ID from the Recruiter table using the user's email
    const userEmail = session.user?.email;
    if (!userEmail) {
      return NextResponse.json({ error: "User email not found" }, { status: 400 });
    }

    // Check if recruiter exists in legacy Recruiter table
    const recruiter = await prisma.recruiter.findUnique({
      where: { email: userEmail },
      select: { id: true }
    });

    if (!recruiter) {
      return NextResponse.json({ error: "Recruiter not found" }, { status: 404 });
    }

    // Check if the job exists and belongs to this recruiter
    const existingJob = await prisma.job.findUnique({
      where: { id },
      select: { postedBy: true }
    });

    if (!existingJob) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (existingJob.postedBy !== recruiter.id) {
      return NextResponse.json({ error: "Unauthorized to edit this job" }, { status: 403 });
    }

    // Prepare update data (exclude fields that shouldn't be updated)
    const { postedBy, postedDate, applicantsCount, ...updateData } = data;

    // Update the job
    const updatedJob = await prisma.job.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedJob, { status: 200 });
  } catch (error) {
    console.error("Error updating job:", error);
    return NextResponse.json({ 
      error: "Failed to update job",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 