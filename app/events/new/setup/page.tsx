"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FlowShell from "@/components/events/new/FlowShell";
import StepHeader from "@/components/events/new/StepHeader";
import ChoiceCard from "@/components/events/new/ChoiceCard";
import TextField from "@/components/events/new/TextField";
import TierCard from "@/components/events/new/TierCard";
import GuestsSlider from "@/components/events/new/GuestsSlider";
import PrimaryButton from "@/components/events/new/PrimaryButton";
import {
  matchingModes,
  ageModes,
  tiers,
  MatchingMode,
  AgeMode,
  TierId,
} from "@/lib/events/new/mock";

export default function SetupPage() {
  const router = useRouter();
  const [matchingMode, setMatchingMode] = useState<MatchingMode>("Platonic");
  const [ageMode, setAgeMode] = useState<AgeMode>("Ignore");
  const [eventTitle, setEventTitle] = useState("");
  const [hostName, setHostName] = useState("");
  const [date, setDate] = useState("");
  const [selectedTier, setSelectedTier] = useState<TierId>("free");
  const [guestCount, setGuestCount] = useState(50);

  const handleNext = () => {
    router.push("/onboarding/questions");
  };

  return (
    <FlowShell>
      <StepHeader
        title="Customize your matching"
        subtitle="Set up your event preferences"
      />

      <div className="space-y-8 mb-12">
        {/* Matching Mode */}
        <div>
          <h2 className="text-xl font-light text-gray-dark mb-4">Matching Experience</h2>
          <div className="space-y-3">
            {matchingModes.map((mode) => (
              <ChoiceCard
                key={mode.id}
                title={mode.title}
                subtitle={mode.subtitle}
                selected={matchingMode === mode.id}
                onClick={() => setMatchingMode(mode.id)}
              />
            ))}
          </div>
        </div>

        {/* Age Mode */}
        <div>
          <h2 className="text-xl font-light text-gray-dark mb-4">Consider Ages</h2>
          <div className="space-y-3">
            {ageModes.map((mode) => (
              <ChoiceCard
                key={mode.id}
                title={mode.title}
                subtitle={mode.subtitle}
                selected={ageMode === mode.id}
                onClick={() => setAgeMode(mode.id)}
              />
            ))}
          </div>
        </div>

        {/* Event Details */}
        <div>
          <h2 className="text-xl font-light text-gray-dark mb-4">Event Details</h2>
          <div className="space-y-4">
            <TextField
              label="Event Title"
              placeholder="Enter event title"
              value={eventTitle}
              onChange={setEventTitle}
            />
            <TextField
              label="Host Name"
              placeholder="Enter host name"
              value={hostName}
              onChange={setHostName}
            />
            <TextField
              label="Date"
              placeholder="dd/mm/yyyy"
              value={date}
              onChange={setDate}
            />
          </div>
        </div>

        {/* Tier Selection */}
        <div>
          <h2 className="text-xl font-light text-gray-dark mb-4">Choose a tier</h2>
          <div className="space-y-3">
            {tiers.map((tier) => (
              <TierCard
                key={tier.id}
                tier={tier}
                selected={selectedTier === tier.id}
                onClick={() => setSelectedTier(tier.id)}
              />
            ))}
          </div>
        </div>

        {/* Guest Count */}
        <div>
          <h2 className="text-xl font-light text-gray-dark mb-4">How many guests?</h2>
          <GuestsSlider value={guestCount} onChange={setGuestCount} />
        </div>
      </div>

      <div className="flex justify-end">
        <PrimaryButton onClick={handleNext}>Next</PrimaryButton>
      </div>
    </FlowShell>
  );
}

