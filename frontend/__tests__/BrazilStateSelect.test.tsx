import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BrazilStateSelect from "@/components/BrazilStateSelect";

describe("BrazilStateSelect", () => {
  it("exibe UF por padrão e permite digitar para filtrar estados sem acento", () => {
    const onChange = vi.fn();
    render(<BrazilStateSelect value="" onChange={onChange} />);

    const btn = screen.getByTestId("state-select-button");
    expect(btn.textContent).toContain("UF");

    fireEvent.click(btn);
    const search = screen.getByTestId("state-search-input");
    fireEvent.change(search, { target: { value: "maranhao" } });

    expect(screen.getByTestId("state-option-MA")).toBeDefined();
    expect(screen.queryByTestId("state-option-SP")).toBeNull();

    fireEvent.click(screen.getByTestId("state-option-MA"));
    expect(onChange).toHaveBeenCalledWith("MA");
    expect(screen.queryByTestId("state-dropdown-menu")).toBeNull();
  });

  it("permite filtrar pela sigla da UF", () => {
    const onChange = vi.fn();
    render(<BrazilStateSelect value="SP" onChange={onChange} />);

    expect(screen.getByTestId("state-select-button").textContent).toContain("SP - São Paulo");

    fireEvent.click(screen.getByTestId("state-select-button"));
    fireEvent.change(screen.getByTestId("state-search-input"), { target: { value: "mg" } });

    expect(screen.getByTestId("state-option-MG")).toBeDefined();
    expect(screen.queryByTestId("state-option-SP")).toBeNull();
  });
});
