import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RequestLimitsFields from "@/components/RequestLimitsFields";

describe("RequestLimitsFields Component", () => {
  it("não renderiza nada quando o papel é admin", () => {
    const { container } = render(
      <RequestLimitsFields
        role="admin"
        unlimitedDaily={true}
        onUnlimitedDailyChange={vi.fn()}
        dailyLimit="8"
        onDailyLimitChange={vi.fn()}
        unlimitedTotal={true}
        onUnlimitedTotalChange={vi.fn()}
        totalLimit="100"
        onTotalLimitChange={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("permite alternar entre ilimitado e valores personalizados para aluno", () => {
    const onUnlimitedDailyChange = vi.fn();
    const onDailyLimitChange = vi.fn();
    const onUnlimitedTotalChange = vi.fn();
    const onTotalLimitChange = vi.fn();

    render(
      <RequestLimitsFields
        role="client"
        unlimitedDaily={false}
        onUnlimitedDailyChange={onUnlimitedDailyChange}
        dailyLimit="8"
        onDailyLimitChange={onDailyLimitChange}
        unlimitedTotal={false}
        onUnlimitedTotalChange={onUnlimitedTotalChange}
        totalLimit="100"
        onTotalLimitChange={onTotalLimitChange}
      />
    );

    expect(screen.getByTestId("request-limits-fields")).toBeDefined();

    fireEvent.change(screen.getByTestId("daily-limit-input"), { target: { value: "12" } });
    expect(onDailyLimitChange).toHaveBeenCalledWith("12");

    fireEvent.change(screen.getByTestId("total-limit-input"), { target: { value: "250" } });
    expect(onTotalLimitChange).toHaveBeenCalledWith("250");

    fireEvent.click(screen.getByTestId("daily-limit-unlimited-btn"));
    expect(onUnlimitedDailyChange).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByTestId("total-limit-unlimited-btn"));
    expect(onUnlimitedTotalChange).toHaveBeenCalledWith(true);
  });

  it("permite selecionar o modo Franquia -> depois diário e ativa os campos automaticamente", () => {
    const onLimitModeChange = vi.fn();
    const onUnlimitedDailyChange = vi.fn();
    const onUnlimitedTotalChange = vi.fn();

    render(
      <RequestLimitsFields
        role="client"
        limitMode="strict"
        onLimitModeChange={onLimitModeChange}
        unlimitedDaily={true}
        onUnlimitedDailyChange={onUnlimitedDailyChange}
        dailyLimit="3"
        onDailyLimitChange={vi.fn()}
        unlimitedTotal={true}
        onUnlimitedTotalChange={onUnlimitedTotalChange}
        totalLimit="100"
        onTotalLimitChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId("limit-mode-quota-then-daily-btn"));
    expect(onLimitModeChange).toHaveBeenCalledWith("quota_then_daily");
    expect(onUnlimitedTotalChange).toHaveBeenCalledWith(false);
    expect(onUnlimitedDailyChange).toHaveBeenCalledWith(false);
  });
});
