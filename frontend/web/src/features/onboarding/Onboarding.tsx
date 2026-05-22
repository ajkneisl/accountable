// Onboarding — five-step account-creation flow.
// Steps are driven by local state; Back / Continue move between them.

import { useState } from "react"
import { TOTAL } from "./constants"
import { StepSignup } from "./components/StepSignup"
import { StepPickGoal } from "./components/StepPickGoal"
import { StepConnect } from "./components/StepConnect"
import { StepInvite } from "./components/StepInvite"
import { StepDone } from "./components/StepDone"

export default function Onboarding() {
    const [step, setStep] = useState(1)
    const next = () => setStep((s) => Math.min(TOTAL, s + 1))
    const back = () => setStep((s) => Math.max(1, s - 1))

    switch (step) {
        case 1:
            return <StepSignup next={next} />
        case 2:
            return <StepPickGoal next={next} back={back} />
        case 3:
            return <StepConnect next={next} back={back} />
        case 4:
            return <StepInvite next={next} back={back} />
        default:
            return <StepDone />
    }
}
