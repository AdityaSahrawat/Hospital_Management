import { Router , Request , Response } from "express";
import {prismaClient} from '@repo/db'

type DiseaseInput = {
  name: string;
  subcategories: {
    name: string;
    age_groups: {
      group: string;
      age_range: string;
      medicines: { name: string; dosage: string; notes: string }[];
    }[];
  }[];
};

const webRouter : Router = Router();


//DONE
webRouter.get("/staff", async (req: Request, res: Response) => {
  try {
    const staff = await prismaClient.staff.findMany({
      include: { department: true },
    });
    res.json(staff);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch staff" });
  }
});

// DONE
webRouter.post("/staff", async (req: Request, res: Response) => {
  const { specialization, departmentId, isAvailable } = req.body;
  try {
    if(specialization != 'nurse' && !departmentId){
      return res.status(403).json({
        message : "required departmentId"
      })
    }
    if(specialization == 'nurse' && departmentId){
      return res.status(403).json({
        message : "nurse can't be linked to a department"
      })
    }
    let isAva = true
    if(isAvailable){
      isAva = isAvailable
    }
    
    const newStaff = await prismaClient.staff.create({
      data: { specialization, departmentId, isAvailable : isAva },
    });
    return res.status(201).json(newStaff);
  } catch (error) {
    return res.status(400).json({ error: "Failed to create staff" });
  }
});

//DONE
// PUT update staff by id
webRouter.put("/staff/:id", async (req: Request, res: Response) => {
  try {
    if(!req.params.id){
      return res.status(403).json({
        message : "no staff id found"
      })
    }

    const staffId = parseInt(req.params.id);
    const { specialization, departmentId, isAvailable } = req.body;

    const updatedStaff = await prismaClient.staff.update({
      where: { id: staffId },
      data: { specialization, departmentId, isAvailable },
    });

    res.json(updatedStaff);
  } catch (error) {
    res.status(400).json({ error: "Failed to update staff" });
  }
});

webRouter.get("/hospital", async (req: Request, res: Response) => {
  try {
    const hospitalData = await prismaClient.department.findMany({
      include: {
        beds: true,
        staff: true,
      },
    });

    const diseases = await prismaClient.disease.findMany({
      include: {
        subcategories: {
          include: {
            ageGroups: {
              include: { medicines: true },
            },
          },
        },
      },
    });

    res.json({ departments: hospitalData, diseases });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch hospital data" });
  }
});

/**
 * ========================
 * Department Routes
 * ========================
 */

// DONE
// GET all departments with staff and beds 
webRouter.get("/departments", async (req: Request, res: Response) => {
  try {
    const departments = await prismaClient.department.findMany({
      include: {
        staff: true,
        beds: true,
      },
    });
    res.json(departments);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch departments" });
  }
});

// DONE
// POST create department 
webRouter.post("/departments", async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const department = await prismaClient.department.create({
      data: { name },
    });
    res.status(201).json(department);
  } catch (error) {
    res.status(400).json({ error: "Failed to create department" });
  }
});

// DONE
// PUT update department
webRouter.put("/departments/:id", async (req: Request, res: Response) => {
  try {

    if(!req.params.id){
      return res.status(403).json({
        message : "no department id found"
      })
    }
    const departmentId = parseInt(req.params.id);
    const { name } = req.body;
    const updated = await prismaClient.department.update({
      where: { id: departmentId },
      data: { name },
    });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: "Failed to update department" });
  }
});

/**
 * ========================
 * Bed Routes
 * ========================
 */

//DONE
// GET all beds
webRouter.get("/beds", async (req: Request, res: Response) => {
  try {
    const beds = await prismaClient.bed.findMany({
      include: { department: true },
    });
    res.json(beds);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch beds" });
  }
});

//DONE
// POST create bed
webRouter.post("/beds", async (req: Request, res: Response) => {
  try {
    const { type, status, departmentId } = req.body;

    if(!type || !departmentId){
      return res.status(403).json({
        message : "required type or departmentId"
      })
    }

    let isava = "free"

    if(status){
      isava = status
    }
    const bed = await prismaClient.bed.create({
      data: { type, status : isava, departmentId },
    });
    res.status(201).json(bed);
  } catch (error) {
    res.status(400).json({ error: "Failed to create bed" });
  }
});

//DONE
// PUT update bed
webRouter.put("/beds/:id", async (req: Request, res: Response) => {
  try {

    if(!req.params.id){
      return res.status(403).json({
        message : "no bed id found"
      })
    }

    const bedId = parseInt(req.params.id);
    const { type, status, departmentId } = req.body;
    const updated = await prismaClient.bed.update({
      where: { id: bedId },
      data: { type, status, departmentId },
    });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: "Failed to update bed" });
  }
});

/**
 * ========================
 * Disease Routes
 * ========================
 */

// GET all diseases in website format
webRouter.get("/diseases", async (req: Request, res: Response) => {
  try {
    type DiseasesResult = Awaited<ReturnType<typeof prismaClient.disease.findMany>>;

    const diseases : DiseasesResult = await prismaClient.disease.findMany({
      include: {
        subcategories: {
          include: {
            ageGroups: {
              include: { medicines: true },
            },
          },
        },
      },
    });

    // Transform data to desired format with IDs
    const formatted = diseases.map((d : DiseasesResult[number]) => ({
      id: d.id,
      disease: d.name,
      subcategories: d.subcategories.map((sc: typeof d.subcategories[number]) => ({
        id: sc.id,
        name: sc.name,
        age_groups: sc.ageGroups.map((ag: typeof sc.ageGroups[number]) => ({
          id: ag.id,
          group: ag.group,
          age_range: ag.ageRange,
          medicines: ag.medicines.map((m: typeof ag.medicines[number]) => ({
            id: m.id,
            name: m.name,
            dosage: m.dosage,
            notes: m.notes,
          })),
        })),
      })),
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch diseases" });
  }
});


// POST create disease
webRouter.post("/diseases", async (req: Request, res: Response) => {
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
                group: ag.group,
                ageRange: ag.age_range,
                medicines: {
                  create: ag.medicines.map((m) => ({
                    name: m.name,
                    dosage: m.dosage,
                    notes: m.notes ?? "",
                  })),
                },
              })),
            },
          })),
        },
      },
      include: {
        subcategories: {
          include: { ageGroups: { include: { medicines: true } } },
        },
      },
    });

    res.status(201).json(toWebsiteFormat(disease));
  } catch (err: any) {
    if (err?.code === "P2002") {
      return res.status(409).json({ error: "Disease name must be unique" });
    }
    res.status(400).json({ error: err?.message ?? "Failed to create disease" });
  }
});

/* ---------- PUT /diseases/:id (replace whole tree safely) ---------- */

webRouter.put("/diseases/:id", async (req : Request, res : Response) => {
  try {
    if(!req.params.id){
      return res.status(403).json({
        message : "no disease id found"
      })
    }
    const diseaseId = parseInt(req.params.id);
    const { name, subcategories } = req.body as DiseaseInput;

    // Step 1: delete children in correct order (medicines → ageGroups → subcategories)
    await prismaClient.medicine.deleteMany({
      where: { ageGroup: { subcategory: { diseaseId } } },
    });

    await prismaClient.ageGroup.deleteMany({
      where: { subcategory: { diseaseId } },
    });

    await prismaClient.subcategory.deleteMany({
      where: { diseaseId },
    });

    // Step 2: update disease and recreate nested structure
    const updatedDisease = await prismaClient.disease.update({
      where: { id: diseaseId },
      data: {
        name,
        subcategories: {
          create: subcategories.map(sc => ({
            name: sc.name,
            ageGroups: {
              create: sc.age_groups.map(ag => ({
                group: ag.group,
                ageRange: ag.age_range,
                medicines: {
                  create: ag.medicines.map(m => ({
                    name: m.name,
                    dosage: m.dosage,
                    notes: m.notes,
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
            ageGroups: { include: { medicines: true } },
          },
        },
      },
    });

    res.json(updatedDisease);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update disease" });
  }
});



export default webRouter;




function validateDiseasePayload(body: any): asserts body is DiseaseInput {
  if (!body?.name || !Array.isArray(body.subcategories) || body.subcategories.length < 1) {
    throw new Error("At least one subcategory is required");
  }
  for (const sc of body.subcategories) {
    if (!sc?.name) throw new Error("Subcategory name is required");
    if (!Array.isArray(sc.age_groups) || sc.age_groups.length < 1) {
      throw new Error("Each subcategory must have at least one age group");
    }
    for (const ag of sc.age_groups) {
      if (!ag?.group || !ag?.age_range) throw new Error("Age group 'group' and 'age_range' are required");
      if (!Array.isArray(ag.medicines) || ag.medicines.length < 1) {
        throw new Error("Each age group must have at least one medicine");
      }
      for (const m of ag.medicines) {
        if (!m?.name || !m?.dosage) throw new Error("Medicine 'name' and 'dosage' are required");
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
        medicines: ag.medicines.map((m: any) => ({
          name: m.name,
          dosage: m.dosage,
          notes: m.notes,
        })),
      })),
    })),
  };
}