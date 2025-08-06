import { answerCollection, db, questionCollection, voteCollection } from "@/models/name";
import { databases, users } from "@/models/server/config";
import { UserPrefs } from "@/store/Auth";
import { NextRequest, NextResponse } from "next/server";
import { ID, Query } from "node-appwrite";

export async function POST(request: NextRequest){
    try {
        //grab the data
        const {votedById, voteStatus, type, typeId} = await request.json()
        //check existing vote
        const existingVoteRes = await databases.listDocuments(
            db, voteCollection, [
                Query.equal("type",type),
                Query.equal("typeId",typeId),
                Query.equal("votedById",votedById),
            ]
        ) //Query.equal is ANDing all the results and giving the matching document
        console.log(existingVoteRes);

        const existingVote = existingVoteRes.documents[0];

        // Fetch Author
        const questionOrAnswer = await databases.getDocument(
            db,
            type === "question" ? questionCollection : answerCollection,
            typeId
        );

        const authorId = questionOrAnswer.authorId;
        const authorPrefs = await users.getPrefs<UserPrefs>(authorId);

        let doc=null;
        let voteAction = "Voted"
        
        
        if(existingVote){
            // If same vote - unvote
            if (existingVote.voteStatus === voteStatus){
                await databases.deleteDocument(db, voteCollection, existingVote.$id);

            await users.updatePrefs<UserPrefs>(authorId, {
                reputation: 
                    existingVote.voteStatus === "upvoted" 
                    ? Number(authorPrefs.reputation) - 1 
                    : Number(authorPrefs.reputation) + 1
            });
                voteAction = "Vote Withdrawn";
            } else {
               await databases.deleteDocument(db, voteCollection, existingVote.$id);
               doc = await databases.createDocument(db, voteCollection, ID.unique(), {
                type,
                typeId,
                voteStatus,
                votedById
               });
               
               await users.updatePrefs<UserPrefs>(authorId, {
                reputation: 
                    existingVote.voteStatus === "upvoted" 
                    ? Number(authorPrefs.reputation) + 2 
                    : Number(authorPrefs.reputation) - 2
            });
                voteAction = "Vote Status Updated";
            }

        } else {
            // First time voting
            doc = await databases.createDocument(db, voteCollection, ID.unique(), {
                type,
                typeId,
                voteStatus,
                votedById
               });

            await users.updatePrefs<UserPrefs>(authorId, {
                reputation:
                    voteStatus === "upvoted"
                        ? Number(authorPrefs.reputation) + 1
                        : Number(authorPrefs.reputation) - 1,
            }); 
        }

        const [upvotes, downvotes] = await Promise.all(
            [
                databases.listDocuments(db, voteCollection, [
                   Query.equal("type",type),
                   Query.equal("typeId",typeId),
                   Query.equal("votedById",votedById),
                   Query.equal("voteStatus","upvoted"),
                   Query.limit(1), //check only if user upvoted or not, but not to check how many times he clicked the button
                ]),
                databases.listDocuments(db, voteCollection, [
                   Query.equal("type",type),
                   Query.equal("typeId",typeId),
                   Query.equal("votedById",votedById),
                   Query.equal("voteStatus","downvoted"),
                   Query.limit(1),
                ])
            ]
        );

        return NextResponse.json(
            {
                data: {
                    document: doc, 
                    voteResult: upvotes.total - downvotes.total
                },
                message: voteAction
            },
            {
                status: 201
            }
        );
    } catch (error: any) {
        return NextResponse.json(
            {
                error: error?.message || "Error in voting"
            },
            {
                status: error?.status || error?.code || 500
            }
        );
    }
}