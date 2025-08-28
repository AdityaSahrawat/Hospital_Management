import { Router, Request, Response } from "express";
import { prismaClient, Prisma, AgeGroupEnum, BedStatus } from "@repo/db";

const bulkRouter: Router = Router();

// Bulk create medicines
bulkRouter.post("/medicines", async (req: Request, res: Response) => {
  try {
    const medicines = req.body;

    if (!Array.isArray(medicines)) {
      return res.status(400).json({ error: "Expected an array of medicines" });
    }

    // Validate each medicine
    for (const medicine of medicines) {
      const { name, form, strength, unit } = medicine;
      if (!name || !form || !strength || !unit) {
        return res.status(400).json({ 
          error: "Missing required fields in one or more medicines", 
          required: ["name", "form", "strength", "unit"],
          received: medicine
        });
      }
    }

    // Create medicines in bulk (without the id field)
    const createdMedicines = await prismaClient.medicine.createMany({
      data: medicines.map(({ id, ...medicine }) => medicine),
      skipDuplicates: true
    });

    res.status(201).json({
      message: `Successfully created ${createdMedicines.count} medicines`,
      count: createdMedicines.count
    });
  } catch (error: any) {
    console.error("Bulk medicine creation error:", error);
    res.status(400).json({ 
      error: "Failed to create medicines in bulk", 
      detail: error.message 
    });
  }
});

// Bulk create inventory items
bulkRouter.post("/inventory", async (req: Request, res: Response) => {
  try {
    const inventoryItems = req.body;

    if (!Array.isArray(inventoryItems)) {
      return res.status(400).json({ error: "Expected an array of inventory items" });
    }

    // Validate each inventory item
    for (const item of inventoryItems) {
      const { medicineId, availableQty } = item;
      if (!medicineId || availableQty === undefined) {
        return res.status(400).json({ 
          error: "Missing required fields in one or more inventory items", 
          required: ["medicineId", "availableQty"],
          received: item
        });
      }
    }

    // Create inventory items in bulk (without the id field)
    const createdInventory = await prismaClient.inventory.createMany({
      data: inventoryItems.map(({ id, ...item }) => ({
        ...item,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : null
      })),
      skipDuplicates: true
    });

    res.status(201).json({
      message: `Successfully created ${createdInventory.count} inventory items`,
      count: createdInventory.count
    });
  } catch (error: any) {
    console.error("Bulk inventory creation error:", error);
    res.status(400).json({ 
      error: "Failed to create inventory items in bulk", 
      detail: error.message 
    });
  }
});

// Bulk create diseases (simplified version - just disease names)
bulkRouter.post("/diseases", async (req: Request, res: Response) => {
  try {
    const diseases = req.body;

    if (!Array.isArray(diseases)) {
      return res.status(400).json({ error: "Expected an array of diseases" });
    }

    // Validate each disease
    for (const disease of diseases) {
      const { name } = disease;
      if (!name) {
        return res.status(400).json({ 
          error: "Missing required fields in one or more diseases", 
          required: ["name"],
          received: disease
        });
      }
    }

    // Create diseases in bulk (without the id field)
    const createdDiseases = await prismaClient.disease.createMany({
      data: diseases.map(({ id, ...disease }) => disease),
      skipDuplicates: true
    });

    res.status(201).json({
      message: `Successfully created ${createdDiseases.count} diseases`,
      count: createdDiseases.count
    });
  } catch (error: any) {
    console.error("Bulk disease creation error:", error);
    if (error?.code === "P2002") {
      return res.status(409).json({ error: "One or more disease names already exist" });
    }
    res.status(400).json({ 
      error: "Failed to create diseases in bulk", 
      detail: error.message 
    });
  }
});

// Helper function to map group names to enum values
function mapGroupToEnum(group: string): AgeGroupEnum {
  const groupMap: { [key: string]: AgeGroupEnum } = {
    'Child': AgeGroupEnum.CHILD,
    'child': AgeGroupEnum.CHILD,
    'CHILD': AgeGroupEnum.CHILD,
    'Teenager': AgeGroupEnum.TEENAGER,
    'teenager': AgeGroupEnum.TEENAGER,
    'TEENAGER': AgeGroupEnum.TEENAGER,
    'Adult': AgeGroupEnum.ADULT,
    'adult': AgeGroupEnum.ADULT,
    'ADULT': AgeGroupEnum.ADULT,
    'Older': AgeGroupEnum.OLDER,
    'older': AgeGroupEnum.OLDER,
    'OLDER': AgeGroupEnum.OLDER
  };
  
  return groupMap[group] || AgeGroupEnum.ADULT; // Default to ADULT if not found
}

// Bulk create complex diseases with subcategories and age groups
bulkRouter.post("/diseases/complex", async (req: Request, res: Response) => {
  try {
    const diseases = req.body;

    if (!Array.isArray(diseases)) {
      return res.status(400).json({ error: "Expected an array of diseases" });
    }

    const results = [];

    // Process each disease individually to handle complex relationships
    for (const diseaseData of diseases) {
      const { id, name, subcategories } = diseaseData;
      
      if (!name || !Array.isArray(subcategories)) {
        return res.status(400).json({ 
          error: "Missing required fields in disease", 
          required: ["name", "subcategories"],
          received: diseaseData
        });
      }

      try {
        const disease = await prismaClient.disease.create({
          data: {
            name,
            subcategories: {
              create: subcategories.map((sc: any) => ({
                name: sc.name,
                ageGroups: {
                  create: sc.age_groups?.map((ag: any) => ({
                    group: mapGroupToEnum(ag.group),
                    ageRange: ag.age_range,
                    prescribed: {
                      create: ag.medicines?.map((m: any) => ({
                        dosage: m.dosage,
                        notes: m.notes ?? "",
                        medicine: {
                          connect: {
                            id: typeof m.medicineId === 'string' ? parseInt(m.medicineId) : m.medicineId,
                          },
                        },
                      })) || [],
                    },
                  })) || [],
                },
              })),
            },
          },
          include: {
            subcategories: {
              include: {
                ageGroups: {
                  include: { prescribed: { include: { medicine: true } } },
                },
              },
            },
          },
        });

        results.push(disease);
      } catch (err: any) {
        if (err?.code === "P2002") {
          console.log(`Skipping duplicate disease: ${name}`);
          continue;
        }
        throw err;
      }
    }

    res.status(201).json({
      message: `Successfully created ${results.length} complex diseases`,
      count: results.length,
      diseases: results
    });
  } catch (error: any) {
    console.error("Bulk complex disease creation error:", error);
    res.status(400).json({ 
      error: "Failed to create complex diseases in bulk", 
      detail: error.message 
    });
  }
});

export default bulkRouter
