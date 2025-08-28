import { Router, Request, Response } from "express";
import { prismaClient, Prisma, AgeGroupEnum, BedStatus } from "@repo/db";

const webRouter: Router = Router();


type DiseaseWithRelations = Prisma.DiseaseGetPayload<{
  include: {
    subcategories: {
      include: {
        ageGroups: {
          include: {
            prescribed: {
              include: { medicine: true };
            };
          };
        };
      };
    };
  };
}>;

type DiseaseInput = {
  name: string;
  subcategories: {
    name: string;
    age_groups: {
      group: string;
      age_range: string;
      medicines: { medicineId: number | string; dosage: string; notes?: string }[];
    }[];
  }[];
};


// GET all staff
webRouter.get("/staff", async (req: Request, res: Response) => {
  try {
    const staff = await prismaClient.staff.findMany({
      include: { department: true },
    });
    res.json(staff);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch staff", detail: error });
  }
});

// CREATE staff
webRouter.post("/staff", async (req: Request, res: Response) => {
  const { name, specialization, departmentId, isAvailable } = req.body;
  try {
    // business rules
    if (specialization !== "nurse" && !departmentId) {
      return res.status(400).json({ message: "departmentId required" });
    }
    if (specialization === "nurse" && departmentId) {
      return res
        .status(400)
        .json({ message: "nurse cannot be linked to department" });
    }

    const staff = await prismaClient.staff.create({
      data: {
        name,
        specialization,
        departmentId,
        isAvailable: isAvailable ?? true,
      },
    });
    res.status(201).json(staff);
  } catch (error) {
    res.status(400).json({ error: "Failed to create staff" });
  }
});

// UPDATE staff
webRouter.put("/staff/:id", async (req: Request, res: Response) => {
  try {
    if(!req.params.id){
      return res.status(403).json({
        message : "staff id is required"
      })
    }
    const staffId = parseInt(req.params.id);
    const { name, specialization, departmentId, isAvailable } = req.body;

    const updated = await prismaClient.staff.update({
      where: { id: staffId },
      data: { name, specialization, departmentId, isAvailable },
    });

    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: "Failed to update staff" });
  }
});

// DELETE staff
webRouter.delete("/staff/:id", async (req, res) => {
  try {
    if(!req.params.id){
      return res.status(403).json({
        message : "staff id is required"
      })
    }
    const staffId = parseInt(req.params.id);
    const deleted = await prismaClient.staff.delete({ where: { id: staffId } });
    res.json(deleted);
  } catch (error) {
    res.status(400).json({ error: "Failed to delete staff" });
  }
});

/* ==================================================
   Hospital Route (all-in-one overview)
================================================== */
webRouter.get("/hospital", async (_req, res) => {
  try {
    const departments = await prismaClient.department.findMany({
      include: { beds: true, staff: true },
    });

    const diseases = await prismaClient.disease.findMany({
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

    res.json({ departments, diseases: diseases.map(toWebsiteFormat) });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch hospital data" });
  }
});

/* ==================================================
   Department Routes
================================================== */

webRouter.get("/departments", async (_req, res) => {
  try {
    const departments = await prismaClient.department.findMany({
      include: { staff: true, beds: true },
    });
    res.json(departments);
  } catch {
    res.status(500).json({ error: "Failed to fetch departments" });
  }
});

webRouter.post("/departments", async (req, res) => {
  try {
    const { name } = req.body;
    const department = await prismaClient.department.create({ data: { name } });
    res.status(201).json(department);
  } catch {
    res.status(400).json({ error: "Failed to create department" });
  }
});

webRouter.put("/departments/:id", async (req, res) => {
  try {
    const depId = parseInt(req.params.id);
    const { name } = req.body;
    const updated = await prismaClient.department.update({
      where: { id: depId },
      data: { name },
    });
    res.json(updated);
  } catch {
    res.status(400).json({ error: "Failed to update department" });
  }
});

/* ==================================================
   Bed Routes
================================================== */

webRouter.get("/beds", async (_req, res) => {
  try {
    const beds = await prismaClient.bed.findMany({
      include: { department: true },
    });
    res.json(beds);
  } catch {
    res.status(500).json({ error: "Failed to fetch beds" });
  }
});

webRouter.post("/beds", async (req, res) => {
  try {
    const { type, status, departmentId } = req.body;
    if (!type || !departmentId)
      return res
        .status(400)
        .json({ message: "Missing type or departmentId" });

    const bed = await prismaClient.bed.create({
      data: { type, status, departmentId },
    });
    res.status(201).json(bed);
  } catch {
    res.status(400).json({ error: "Failed to create bed" });
  }
});

webRouter.put("/beds/:id", async (req, res) => {
  try {
    const bedId = parseInt(req.params.id);
    const { type, status, departmentId } = req.body;
    const updated = await prismaClient.bed.update({
      where: { id: bedId },
      data: { type, status, departmentId },
    });
    res.json(updated);
  } catch {
    res.status(400).json({ error: "Failed to update bed" });
  }
});

webRouter.delete("/beds/:id", async (req, res) => {
  try {
    const bedId = parseInt(req.params.id);
    const deleted = await prismaClient.bed.delete({ where: { id: bedId } });
    res.json(deleted);
  } catch {
    res.status(400).json({ error: "Failed to delete bed" });
  }
});

// GET all diseases
webRouter.get("/diseases", async (_req, res) => {
  try {
    const diseases: DiseaseWithRelations[] = await prismaClient.disease.findMany(
      {
        include: {
          subcategories: {
            include: {
              ageGroups: {
                include: { prescribed: { include: { medicine: true } } },
              },
            },
          },
        },
      }
    );

    console.log("disease : " , diseases.map(toWebsiteFormat))
    res.json(diseases);
  } catch {
    res.status(500).json({ error: "Failed to fetch diseases" });
  }
});

// CREATE disease
webRouter.post("/diseases", async (req, res) => {
  try {
    validateDiseasePayload(req.body);
    const { name, subcategories } = req.body as DiseaseInput;

    const disease = await prismaClient.disease.create({
      data: {
        name,
        subcategories: {
          create: subcategories.map((sc) => ({
            name: sc.name,
            ageGroups: {
              create: sc.age_groups.map((ag) => ({
                group: ag.group as AgeGroupEnum,
                ageRange: ag.age_range,
                prescribed: {
                  create: ag.medicines.map((m) => ({
                    dosage: m.dosage,
                    notes: m.notes ?? "",
                    medicine: {
                      connect: {
                        id: typeof m.medicineId === 'string' ? parseInt(m.medicineId) : m.medicineId,
                      },
                    },
                  })),
                },
              })),
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

    res.status(201).json(disease);
  } catch (err: any) {
    if (err?.code === "P2002")
      return res.status(409).json({ error: "Disease name must be unique" });
    console.log("error : " , err)
    res.status(400).json({ error: err?.message ?? "Failed to create disease"  ,err});
  }
});

// UPDATE disease (replace structure)
webRouter.put("/diseases/:id", async (req, res) => {
  try {
    const diseaseId = parseInt(req.params.id);
    const { name, subcategories } = req.body as DiseaseInput;

    await prismaClient.prescribedMedicine.deleteMany({
      where: { ageGroup: { subcategory: { diseaseId } } },
    });
    await prismaClient.ageGroup.deleteMany({
      where: { subcategory: { diseaseId } },
    });
    await prismaClient.subcategory.deleteMany({ where: { diseaseId } });

    const updated = await prismaClient.disease.update({
      where: { id: diseaseId },
      data: {
        name,
        subcategories: {
          create: subcategories.map((sc) => ({
            name: sc.name,
            ageGroups: {
              create: sc.age_groups.map((ag) => ({
                group: ag.group as AgeGroupEnum,
                ageRange: ag.age_range,
                prescribed: {
                  create: ag.medicines.map((m) => ({
                    dosage: m.dosage,
                    notes: m.notes ?? "",
                    medicine: {
                      connect: {
                        id: typeof m.medicineId === 'string' ? parseInt(m.medicineId) : m.medicineId,
                      },
                    },
                  })),
                },
              })),
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

    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update disease" });
  }
});

// DELETE disease
webRouter.delete("/disease/:id", async (req, res) => {
  try {
    const diseaseId = parseInt(req.params.id);

    await prismaClient.prescribedMedicine.deleteMany({
      where: { ageGroup: { subcategory: { diseaseId } } },
    });
    await prismaClient.ageGroup.deleteMany({
      where: { subcategory: { diseaseId } },
    });
    await prismaClient.subcategory.deleteMany({ where: { diseaseId } });

    const deleted = await prismaClient.disease.delete({
      where: { id: diseaseId },
    });
    res.json(deleted);
  } catch {
    res.status(400).json({ error: "Failed to delete disease" });
  }
});

webRouter.get("/medicines", async (_req, res) => {
  try {
    const medicines = await prismaClient.medicine.findMany({
      include: {
        Inventory: true 
      },
    });
    res.json(medicines);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch medicines", detail: error });
  }
});

webRouter.get("/medicines/:id", async (req, res) => {
  try {
    const medicineId = parseInt(req.params.id);
    if (isNaN(medicineId)) {
      return res.status(400).json({ error: "Invalid medicine ID" });
    }

    const medicine = await prismaClient.medicine.findUnique({
      where: { id: medicineId },
      include: {
        Inventory: true 
      },
    });

    if (!medicine) {
      return res.status(404).json({ error: "Medicine not found" });
    }

    res.json(medicine);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch medicine", detail: error });
  }
});

webRouter.post("/medicines", async (req, res) => {
  try {
    const { name, form, strength, unit } = req.body;

    if (!name || !form || !strength || !unit) {
      return res.status(400).json({ 
        error: "Missing required fields", 
        required: ["name", "form", "strength", "unit"] 
      });
    }

    const medicine = await prismaClient.medicine.create({
      data: {
        name,
        form,
        strength,
        unit,
      }
    });

    res.status(201).json(medicine);
  } catch (error) {
    res.status(400).json({ error: "Failed to create medicine", detail: error });
  }
});

webRouter.put("/medicines/:id", async (req, res) => {
  try {
    const medicineId = parseInt(req.params.id);
    if (isNaN(medicineId)) {
      return res.status(400).json({ error: "Invalid medicine ID" });
    }

    const { name, form, strength, unit } = req.body;

    if (!name || !form || !strength || !unit) {
      return res.status(400).json({ 
        error: "Missing required fields", 
        required: ["name", "form", "strength", "unit"] 
      });
    }

    const updatedMedicine = await prismaClient.medicine.update({
      where: { id: medicineId },
      data: {
        name,
        form,
        strength,
        unit,
      },
      include: { 
        prescribed: true,
        Inventory: true 
      },
    });

    res.json(updatedMedicine);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: "Medicine not found" });
    }
    res.status(400).json({ error: "Failed to update medicine", detail: error });
  }
});

webRouter.delete("/medicines/:id", async (req, res) => {
  try {
    const medicineId = parseInt(req.params.id);
    if (isNaN(medicineId)) {
      return res.status(400).json({ error: "Invalid medicine ID" });
    }

    // Check if medicine is being used in prescriptions
    const prescriptionCount = await prismaClient.prescribedMedicine.count({
      where: { medicineId },
    });

    if (prescriptionCount > 0) {
      return res.status(400).json({ 
        error: "Cannot delete medicine that is currently prescribed", 
        prescriptionsCount: prescriptionCount 
      });
    }

    // Check if medicine has inventory
    const inventoryCount = await prismaClient.inventory.count({
      where: { medicineId },
    });

    if (inventoryCount > 0) {
      return res.status(400).json({ 
        error: "Cannot delete medicine that has inventory records", 
        inventoryCount: inventoryCount 
      });
    }

    const deletedMedicine = await prismaClient.medicine.delete({
      where: { id: medicineId },
    });

    res.json(deletedMedicine);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: "Medicine not found" });
    }
    res.status(400).json({ error: "Failed to delete medicine", detail: error });
  }
});

webRouter.get("/inventory", async (_req, res) => {
  try {
    const inventory = await prismaClient.inventory.findMany({
      include: { medicine: true },
    });
    res.json(inventory);
  } catch {
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

webRouter.post("/inventory", async (req, res) => {
  try {
    const { medicineId, availableQty, batchNumber, expiryDate } = req.body;
    const inventory = await prismaClient.inventory.create({
      data: {
        medicineId,
        availableQty,
        batchNumber,
        expiryDate,
      },
    });
    res.status(201).json(inventory);
  } catch {
    res.status(400).json({ error: "Failed to create inventory" });
  }
});

webRouter.put("/inventory/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { availableQty, batchNumber, expiryDate } = req.body;
    const updated = await prismaClient.inventory.update({
      where: { id },
      data: { availableQty, batchNumber, expiryDate },
      include: { medicine: true },
    });
    res.json(updated);
  } catch {
    res.status(400).json({ error: "Failed to update inventory" });
  }
});

webRouter.delete("/inventory/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await prismaClient.inventory.delete({ where: { id } });
    res.json(deleted);
  } catch {
    res.status(400).json({ error: "Failed to delete inventory" });
  }
});


function validateDiseasePayload(body: any): asserts body is DiseaseInput {
  if (!body?.name || !Array.isArray(body.subcategories) || !body.subcategories.length) {
    throw new Error("At least one subcategory is required");
  }
  for (const sc of body.subcategories) {
    if (!sc?.name) throw new Error("Subcategory name is required");
    if (!Array.isArray(sc.age_groups) || !sc.age_groups.length) {
      throw new Error("Each subcategory must have at least one age group");
    }
    for (const ag of sc.age_groups) {
      if (!ag?.group || !ag?.age_range)
        throw new Error("AgeGroup 'group' and 'age_range' are required");
      if (!Array.isArray(ag.medicines) || !ag.medicines.length) {
        throw new Error("Each age group must have at least one medicine");
      }
      for (const m of ag.medicines) {
        if (!m?.medicineId || !m?.dosage) {
          throw new Error("Medicine 'medicineId' and 'dosage' are required");
        }
        // Convert string medicineId to number if needed
        if (typeof m.medicineId === 'string') {
          m.medicineId = parseInt(m.medicineId);
          if (isNaN(m.medicineId) || m.medicineId <= 0) {
            throw new Error("Invalid medicineId - must be a valid number greater than 0");
          }
        }
      }
    }
  }
}

function toWebsiteFormat(d: any) {
  return {
    disease: d.name,
    subcategories: d.subcategories.map((sc: any) => ({
      name: sc.name,
      age_groups: sc.ageGroups.map((ag: any) => ({
        group: ag.group,
        age_range: ag.ageRange,
        medicines: ag.prescribed.map((pm: any) => ({
          name: pm.medicine.name,
          dosage: pm.dosage,
          notes: pm.notes,
        })),
      })),
    })),
  };
}

export default webRouter;
