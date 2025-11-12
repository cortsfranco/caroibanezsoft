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
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: prompt }]
            }],
            generationConfig: {
              responseModalities: ["IMAGE"],
              imageConfig: {
                aspectRatio: "1:1"
              }
            }
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
        throw new Error("No image data returned from Gemini");
      }

      const base64Image = data.candidates[0].content.parts[0].inlineData.data;
      return `data:image/png;base64,${base64Image}`;
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
