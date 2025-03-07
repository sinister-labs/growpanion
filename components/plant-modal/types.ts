export interface Fertilizer {
    name: string;
    amount: string;
}

export interface Plant {
    id: string;
    name: string;
    genetic: string;
    manufacturer: string;
    type: "regular" | "autoflowering" | "feminized";
    propagationMethod: "clone" | "seed";
    yield?: string;
    notes?: any;
    waterings?: WateringRecord[];
    hstRecords?: TrainingRecord[];
    lstRecords?: TrainingRecord[];
    substrateRecords?: SubstrateRecord[];
    images?: string[];
}

export interface WateringRecord {
    date: string;
    amount: string;
    mixId?: string;
}

export interface TrainingRecord {
    date: string;
    method: string;
    notes?: string;
}

export interface SubstrateRecord {
    date: string;
    action?: "potting" | "repotting";
    substrateType: string;
    potSize: string;
    notes?: string;
}

export interface FertilizerMix {
    id: string;
    name: string;
    waterAmount: string;
    fertilizers: Fertilizer[];
}

export type TabType = "info" | "water" | "hst" | "lst" | "substrate" | "notes" | "images";

export interface NoRecordsIndicatorProps {
    icon: React.ElementType;
    text: string;
}

export interface PlantModalProps {
    plant: Plant;
    updatePlant: (plant: Plant) => void;
    deletePlant: (plantId: string, plantName: string) => void;
    growId: string;
}

export interface TabComponentProps {
    localPlant: Plant;
    setLocalPlant: React.Dispatch<React.SetStateAction<Plant>>;
}

export interface WateringFeedingTabProps extends TabComponentProps {
    newWatering: WateringRecord;
    setNewWatering: React.Dispatch<React.SetStateAction<WateringRecord>>;
    handleWateringAdd: () => void;
    handleWateringDelete: (index: number) => void;
    availableMixes: FertilizerMix[];
}

export interface TrainingTabProps extends TabComponentProps {
    newTraining: TrainingRecord;
    setNewTraining: React.Dispatch<React.SetStateAction<TrainingRecord>>;
    handleTrainingAdd: () => void;
    handleTrainingDelete: (index: number) => void;
}

export interface SubstrateTabProps extends TabComponentProps {
    newSubstrate: SubstrateRecord;
    setNewSubstrate: React.Dispatch<React.SetStateAction<SubstrateRecord>>;
    handleSubstrateAdd: () => void;
    handleSubstrateDelete: (index: number) => void;
}

export interface ImagesTabProps extends TabComponentProps {
    setFullscreenImage: React.Dispatch<React.SetStateAction<string | null>>;
    getRootProps: any;
    getInputProps: any;
    isDragActive: boolean;
}

export interface FullscreenImageProps {
    fullscreenImage: string | null;
    setFullscreenImage: React.Dispatch<React.SetStateAction<string | null>>;
} 