import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const topUpId = params.id;
    const body = await request.json();

    const topUpRef = doc(db, 'topUps', topUpId);
    const topUpDoc = await getDoc(topUpRef);

    if (!topUpDoc.exists()) {
      return NextResponse.json({
        success: false,
        error: 'Top-up not found'
      }, { status: 404 });
    }

    // Update the top-up
    await updateDoc(topUpRef, {
      amountEUR: body.amountEUR,
      paymentMethod: body.paymentMethod,
      date: body.date,
      country: body.country,
      notes: body.notes,
      updatedAt: new Date()
    });

    return NextResponse.json({
      success: true,
      message: 'Top-up updated successfully'
    });

  } catch (error) {
    console.error('Error updating top-up:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update top-up'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const topUpId = params.id;

    const topUpRef = doc(db, 'topUps', topUpId);
    const topUpDoc = await getDoc(topUpRef);

    if (!topUpDoc.exists()) {
      return NextResponse.json({
        success: false,
        error: 'Top-up not found'
      }, { status: 404 });
    }

    // Delete the top-up
    await deleteDoc(topUpRef);

    return NextResponse.json({
      success: true,
      message: 'Top-up deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting top-up:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete top-up'
    }, { status: 500 });
  }
}