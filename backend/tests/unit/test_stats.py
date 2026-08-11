import math

from app.stats.calculators import calculate_minimum_detectable_effect, calculate_sample_size
from app.stats.stat_analysis import calculate_uplift, uplift_mode
from app.stats.summary import decision_summary


def test_calculate_sample_size_returns_positive_integer():
    result = calculate_sample_size(p1=0.4, mde=0.05, alpha=0.05, power=0.8)
    assert isinstance(result, int)
    assert result > 0


def test_calculate_mde_returns_positive_number():
    result = calculate_minimum_detectable_effect(p1=0.4, n=2000, alpha=0.05, power=0.8)
    assert result > 0


def test_uplift_relative_handles_zero_baseline():
    result = calculate_uplift(0.0, 0.1, uplift_mode.RELATIVE)
    assert math.isinf(result)


def test_summary_text_reports_significant_positive_uplift():
    summary = decision_summary(p1=0.10, p2=0.20, n1=5000, n2=5000, alpha=0.05)
    text = summary.generate_summary_text()
    assert "statistically significant" in text
    assert "positive effect" in text


def test_summary_text_reports_not_significant_case():
    summary = decision_summary(p1=0.10, p2=0.102, n1=5000, n2=5000, alpha=0.05)
    text = summary.generate_summary_text()
    assert "not statistically significant" in text or "No conclusive decision" in text
