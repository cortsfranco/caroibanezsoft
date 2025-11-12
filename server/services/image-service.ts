export interface ImageGenerationRequest {
  mealName: string;
  ingredients: string;
  portionSize: string;
  description?: string;
}

export class ImageService {
  private apiKey: string | null = null;

  constructor() {
    this.apiKey = process.env.GOOGLE_API_KEY || null;
  }

  isAvailable(): boolean {
    return this.apiKey !== null;
  }

  async generateMealImage(request: ImageGenerationRequest): Promise<string> {
    if (!this.apiKey) {
      throw new Error("Google API key not configured");
    }

    const prompt = this.buildPrompt(request);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": this.apiKey,
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: prompt }]
            }]
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API error response:", errorText);
        throw new Error(`Gemini API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log("Gemini API response structure:", JSON.stringify(data, null, 2));
      
      // Gemini 2.5 Flash Image returns parts that can contain both text and images
      // Find the first part with inline image data
      const parts = data.candidates?.[0]?.content?.parts || [];
      const imagePart = parts.find((part: any) => part.inlineData?.mimeType?.startsWith('image/'));
      
      if (!imagePart?.inlineData?.data) {
        console.error("No image data in response. Parts:", JSON.stringify(parts, null, 2));
        throw new Error("No image data returned from Gemini");
      }

      const base64Image = imagePart.inlineData.data;
      const mimeType = imagePart.inlineData.mimeType || 'image/png';
      return `data:${mimeType};base64,${base64Image}`;
    } catch (error) {
      console.error("Error generating image with Gemini:", error);
      throw new Error(`Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private buildPrompt(request: ImageGenerationRequest): string {
    const parts = [
      `Create a professional, appetizing food photography of ${request.mealName}.`,
    ];

    if (request.description) {
      parts.push(request.description);
    }

    parts.push(
      `The dish should be plated beautifully on a clean white plate.`,
      `Portion size: ${request.portionSize}.`,
      `Main ingredients visible: ${request.ingredients}.`,
      `Natural lighting, top-down view, realistic style, suitable for a nutrition guide.`,
      `High quality, professional food photography, clean background.`,
      `Photorealistic rendering with accurate colors and textures.`
    );

    return parts.join(" ");
  }
}

export const imageService = new ImageService();
