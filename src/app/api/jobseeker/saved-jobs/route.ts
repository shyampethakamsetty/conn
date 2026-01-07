import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET - Fetch saved jobs for a job seeker
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user as any)?.role !== "jobseeker") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = session.user?.email;
    if (!userEmail) {
      return NextResponse.json({ error: "User email not found" }, { status: 400 });
    }

    const jobSeeker = await prisma.jobSeeker.findUnique({
      where: { email: userEmail }
    });

    if (!jobSeeker) {
      return NextResponse.json({ error: "Job seeker not found" }, { status: 404 });
    }

    // Fetch the actual job details
    const savedJobIds = (jobSeeker as any).savedJobs || [];
    const jobs = await prisma.job.findMany({
      where: { id: { in: savedJobIds } },
      orderBy: { postedDate: 'desc' }
    });

    return NextResponse.json(jobs);
  } catch (error) {
    console.error("Error fetching saved jobs:", error);
    return NextResponse.json(
      { error: "Failed to fetch saved jobs" },
      { status: 500 }
    );
  }
}

// POST - Save a job
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user as any)?.role !== "jobseeker") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = session.user?.email;
    if (!userEmail) {
      return NextResponse.json({ error: "User email not found" }, { status: 400 });
    }

    const { jobId } = await request.json();
    if (!jobId) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
    }

    const jobSeeker = await prisma.jobSeeker.findUnique({
      where: { email: userEmail }
    });

    if (!jobSeeker) {
      return NextResponse.json({ error: "Job seeker not found" }, { status: 404 });
    }

    const savedJobs = (jobSeeker as any).savedJobs || [];
    if (savedJobs.includes(jobId)) {
      return NextResponse.json({ message: "Job already saved" }, { status: 200 });
    }

    await prisma.jobSeeker.update({
      where: { email: userEmail },
      data: {
        savedJobs: [...savedJobs, jobId]
      } as any
    });

    return NextResponse.json({ message: "Job saved successfully" });
  } catch (error) {
    console.error("Error saving job:", error);
    return NextResponse.json(
      { error: "Failed to save job" },
      { status: 500 }
    );
  }
}

// DELETE - Unsave a job
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user as any)?.role !== "jobseeker") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = session.user?.email;
    if (!userEmail) {
      return NextResponse.json({ error: "User email not found" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");
    
    if (!jobId) {
      return NextResponse.json({ error: "Job ID is required" }, { status: 400 });
    }

    const jobSeeker = await prisma.jobSeeker.findUnique({
      where: { email: userEmail }
    });

    if (!jobSeeker) {
      return NextResponse.json({ error: "Job seeker not found" }, { status: 404 });
    }

    const savedJobs = (jobSeeker as any).savedJobs || [];
    const updatedSavedJobs = savedJobs.filter((id: string) => id !== jobId);

    await prisma.jobSeeker.update({
      where: { email: userEmail },
      data: {
        savedJobs: updatedSavedJobs
      } as any
    });

    return NextResponse.json({ message: "Job unsaved successfully" });
  } catch (error) {
    console.error("Error unsaving job:", error);
    return NextResponse.json(
      { error: "Failed to unsave job" },
      { status: 500 }
    );
  }
}
