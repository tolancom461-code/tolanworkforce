import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function TestButton() {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    console.log("Button clicked! Count:", count);
    alert(`Button clicked! Count: ${count}`);
    setCount(count + 1);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Button Page</h1>
      <p className="mb-4">Count: {count}</p>
      <Button onClick={handleClick}>
        Click Me!
      </Button>
    </div>
  );
}
