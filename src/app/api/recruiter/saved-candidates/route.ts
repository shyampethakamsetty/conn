import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET - Fetch saved candidates for a recruiter
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user as any)?.role !== "recruiter") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = session.user?.email;
    if (!userEmail) {
      return NextResponse.json({ error: "User email not found" }, { status: 400 });
    }

    const recruiter = await prisma.recruiter.findUnique({
      where: { email: userEmail },
      select: { id: true }
    });

    if (!recruiter) {
      return NextResponse.json({ error: "Recruiter not found" }, { status: 404 });
    }

    // Fetch recruiter with savedCandidates field
    const recruiterWithSaved = await prisma.recruiter.findUnique({
      where: { email: userEmail }
    });

    // Fetch the actual application details
    const savedApplicationIds = (recruiterWithSaved as any)?.savedCandidates || [];
    const applications = await prisma.jobApplication.findMany({
      where: { 
        id: { in: savedApplicationIds },
        recruiterId: recruiter.id
      },
      include: {
        job: {
          select: {
            title: true,
            company: true,
            location: true,
            employmentType: true,
          },
        },
        jobSeeker: {
          select: {
            fullName: true,
            email: true,
            phone: true,
            currentJobTitle: true,
            yearsOfExperience: true,
            education: true,
            skills: true,
            city: true,
            country: true,
            resume: true,
          },
        },
      },
      orderBy: { appliedDate: 'desc' }
    });

    return NextResponse.json(applications);
  } catch (error) {
    console.error("Error fetching saved candidates:", error);
    return NextResponse.json(
      { error: "Failed to fetch saved candidates" },
      { status: 500 }
    );
  }
}

// POST - Save a candidate (application)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user as any)?.role !== "recruiter") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = session.user?.email;
    if (!userEmail) {
      return NextResponse.json({ error: "User email not found" }, { status: 400 });
    }

    const { applicationId } = await request.json();
    if (!applicationId) {
      return NextResponse.json({ error: "Application ID is required" }, { status: 400 });
    }

    const recruiter = await prisma.recruiter.findUnique({
      where: { email: userEmail },
      select: { id: true }
    });

    if (!recruiter) {
      return NextResponse.json({ error: "Recruiter not found" }, { status: 404 });
    }

    // Verify the application belongs to this recruiter
    const application = await prisma.jobApplication.findUnique({
      where: { id: applicationId },
      select: { recruiterId: true }
    });

    if (!application || application.recruiterId !== recruiter.id) {
      return NextResponse.json({ error: "Application not found or unauthorized" }, { status: 404 });
    }

    // Fetch current saved candidates
    const recruiterWithSaved = await prisma.recruiter.findUnique({
      where: { email: userEmail }
    });
    const savedCandidates = (recruiterWithSaved as any)?.savedCandidates || [];
    if (savedCandidates.includes(applicationId)) {
      return NextResponse.json({ message: "Candidate already saved" }, { status: 200 });
    }

    await prisma.recruiter.update({
      where: { email: userEmail },
      data: {
        savedCandidates: [...savedCandidates, applicationId]
      } as any
    });

    return NextResponse.json({ message: "Candidate saved successfully" });
  } catch (error) {
    console.error("Error saving candidate:", error);
    return NextResponse.json(
      { error: "Failed to save candidate" },
      { status: 500 }
    );
  }
}

// DELETE - Unsave a candidate
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user as any)?.role !== "recruiter") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = session.user?.email;
    if (!userEmail) {
      return NextResponse.json({ error: "User email not found" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get("applicationId");
    
    if (!applicationId) {
      return NextResponse.json({ error: "Application ID is required" }, { status: 400 });
    }

    const recruiter = await prisma.recruiter.findUnique({
      where: { email: userEmail }
    });

    if (!recruiter) {
      return NextResponse.json({ error: "Recruiter not found" }, { status: 404 });
    }

    const savedCandidates = (recruiter as any).savedCandidates || [];
    const updatedSavedCandidates = savedCandidates.filter((id: string) => id !== applicationId);

    await prisma.recruiter.update({
      where: { email: userEmail },
      data: {
        savedCandidates: updatedSavedCandidates
      } as any
    });

    return NextResponse.json({ message: "Candidate unsaved successfully" });
  } catch (error) {
    console.error("Error unsaving candidate:", error);
    return NextResponse.json(
      { error: "Failed to unsave candidate" },
      { status: 500 }
    );
  }
}
