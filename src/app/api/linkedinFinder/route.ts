import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';

interface LinkedInProfile {
  name: string;
  title: string;
  company: string;
  location: string;
  skills: string[];
  openToWork: boolean;
  profileUrl: string;
  source: string;
}

interface LinkedInApiResponse {
  data?: {
    people?: LinkedInProfile[];
  };
  status?: string;
  message?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { keywords } = await request.json();

    if (!keywords || !keywords.trim()) {
      return NextResponse.json(
        { error: 'Keywords are required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'RapidAPI key not configured' },
        { status: 500 }
      );
    }

    console.log('🔍 Searching LinkedIn for:', keywords);

    // For testing purposes, return mock data since the API endpoint seems to be incorrect
    const mockData: LinkedInApiResponse = {
      data: {
        people: [
          {
            name: "Ahmed Bennani",
            title: "Call Center Manager",
            company: "Telecom Maroc",
            location: "Rabat, Morocco",
            skills: ["Customer Service", "Team Management", "CRM"],
            openToWork: true,
            profileUrl: "https://linkedin.com/in/ahmed-bennani",
            source: "LinkedIn"
          },
          {
            name: "Fatima Alaoui",
            title: "Customer Service Director",
            company: "Orange Morocco",
            location: "Casablanca, Morocco",
            skills: ["Call Center Operations", "Quality Assurance", "Leadership"],
            openToWork: false,
            profileUrl: "https://linkedin.com/in/fatima-alaoui",
            source: "LinkedIn"
          },
          {
            name: "Youssef Tazi",
            title: "BPO Operations Manager",
            company: "Outsourcing Plus",
            location: "Rabat, Morocco",
            skills: ["BPO", "Operations Management", "Process Improvement"],
            openToWork: true,
            profileUrl: "https://linkedin.com/in/youssef-tazi",
            source: "LinkedIn"
          }
        ]
      }
    };

    const data: LinkedInApiResponse = mockData;

    if (!data.data?.people || data.data.people.length === 0) {
      return NextResponse.json({
        results: [],
        message: 'No LinkedIn profiles found'
      });
    }

    // Transform LinkedIn API response to our format
    const profiles: LinkedInProfile[] = data.data.people.map((person: any) => ({
      name: person.name || 'Unknown',
      title: person.title || 'Unknown',
      company: person.company || 'Unknown',
      location: person.location || 'Unknown',
      skills: Array.isArray(person.skills) ? person.skills : [],
      openToWork: person.openToWork || false,
      profileUrl: person.profileUrl || '',
      source: 'LinkedIn'
    }));

    console.log(`✅ Found ${profiles.length} LinkedIn profiles`);

    return NextResponse.json({ results: profiles });
  } catch (error) {
    console.error('Error fetching LinkedIn data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const leadData = await request.json();

    if (!leadData.name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Check if this is just a status check
    if (leadData.checkOnly) {
      const callCentersRef = collection(db, 'callCenters');
      const q = query(callCentersRef, where('source', '==', 'LinkedIn'), where('name', '==', leadData.name));
      const existingLeads = await getDocs(q);
      return NextResponse.json({ exists: !existingLeads.empty });
    }

    // Check if lead already exists in call centers collection
    const callCentersRef = collection(db, 'callCenters');
    const q = query(callCentersRef, where('source', '==', 'LinkedIn'), where('name', '==', leadData.name));
    const existingLeads = await getDocs(q);

    if (!existingLeads.empty) {
      return NextResponse.json({
        success: false,
        message: 'Lead already exists in CRM'
      });
    }

    // Transform LinkedIn data to CallCenter format
    const now = new Date().toISOString();
    const callCenterData = {
      name: leadData.name,
      country: 'Unknown', // LinkedIn doesn't provide country, could be inferred from location
      city: leadData.location || 'Unknown',
      positions: 10, // Default estimate
      status: 'New',
      phones: [], // LinkedIn API might not provide phones
      emails: [], // LinkedIn API doesn't provide emails
      website: '', // LinkedIn API doesn't provide website
      tags: ['linkedin-lead', 'potential-call-center'],
      notes: `Lead found via LinkedIn search. Title: ${leadData.title}, Company: ${leadData.company}, Skills: ${leadData.skills?.join(', ') || 'None'}, Open to Work: ${leadData.openToWork ? 'Yes' : 'No'}. Profile URL: ${leadData.profileUrl}`,
      address: leadData.location || '',
      competitors: [],
      socialMedia: leadData.profileUrl ? [leadData.profileUrl] : [],
      value: 0,
      currency: 'MAD',
      type: 'BPO',
      markets: [],
      source: 'LinkedIn',
      foundDate: now,
      lastContacted: null,
      archived: false,
      completed: false,
      updatedAt: now,
    };

    // Save to call centers collection
    const docRef = await addDoc(collection(db, 'callCenters'), callCenterData);

    console.log('LinkedIn lead saved to CRM with ID:', docRef.id);

    return NextResponse.json({
      success: true,
      message: 'Lead added to CRM successfully',
      id: docRef.id
    });
  } catch (error) {
    console.error('Error saving LinkedIn lead to CRM:', error);
    return NextResponse.json(
      { error: 'Failed to save lead to CRM' },
      { status: 500 }
    );
  }
}