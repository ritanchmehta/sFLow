import { databases } from "@/models/server/config";

export default async function waitForAttributesReady(dbId: string, collectionId: string, requiredAttrs: string[], maxAttempts = 10, interval = 1000) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const collection = await databases.getCollection(dbId, collectionId);

            const attributes = collection.attributes as {
                key: string;
                status: string;
            }[];

            const allReady = requiredAttrs.every((attr) => {
                const match = attributes.find((a) => a.key === attr);
                return match?.status === "available";
            });

            if (allReady) {
                console.log("All attributes are ready.");
                return;
            }

            console.log(`Attempt ${attempt}: Attributes not ready yet...`);
        } catch (err) {
            console.error("Error checking attribute status:", err);
        }

        // Wait before retrying
        await new Promise((res) => setTimeout(res, interval));
    }

    throw new Error("Attributes did not become available within expected time.");
}
